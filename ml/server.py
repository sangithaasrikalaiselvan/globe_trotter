from __future__ import annotations

from pathlib import Path
from typing import Literal

import joblib
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sklearn.feature_extraction import DictVectorizer
from sklearn.linear_model import LinearRegression
from sklearn.pipeline import Pipeline

ARTIFACT_DIR = Path(__file__).resolve().parent / "artifacts"
MODEL_PATH = ARTIFACT_DIR / "budget_model.joblib"


class PredictRequest(BaseModel):
    trip_days: int = Field(ge=1, le=365)
    source_country: str = Field(min_length=1)
    destination_country: str = Field(min_length=1)
    travel_type: Literal["budget", "mid", "luxury"]
    season: Literal["spring", "summer", "autumn", "winter"]


class PredictResponse(BaseModel):
    estimated_total_cost: float


def _synthetic_training_data(n: int = 300, seed: int = 7):
    rng = np.random.default_rng(seed)

    source_countries = [
        "India",
        "USA",
        "UK",
        "UAE",
        "Germany",
        "Singapore",
        "Australia",
    ]
    destination_countries = [
        "Korea",
        "Japan",
        "Thailand",
        "France",
        "Italy",
        "USA",
        "UAE",
    ]
    travel_types = ["budget", "mid", "luxury"]
    seasons = ["spring", "summer", "autumn", "winter"]

    # Rough baseline “route cost” just to make the demo behave sensibly.
    route_base = {
        ("India", "Korea"): 1200,
        ("India", "Japan"): 1300,
        ("India", "Thailand"): 900,
        ("USA", "Japan"): 1500,
        ("UK", "France"): 450,
        ("Germany", "Italy"): 500,
        ("Singapore", "Thailand"): 400,
        ("UAE", "France"): 800,
    }

    travel_mult = {"budget": 0.85, "mid": 1.0, "luxury": 1.45}
    season_mult = {"spring": 1.0, "summer": 1.15, "autumn": 1.0, "winter": 1.1}

    X: list[dict] = []
    y: list[float] = []

    for _ in range(n):
        src = rng.choice(source_countries)
        dst = rng.choice(destination_countries)
        days = int(rng.integers(2, 21))
        ttype = rng.choice(travel_types)
        season = rng.choice(seasons)

        base = float(route_base.get((src, dst), 1000))
        daily = 80.0 * days
        noise = float(rng.normal(0, 120))

        cost = (base + daily) * travel_mult[ttype] * season_mult[season] + noise
        cost = float(max(100, cost))

        X.append(
            {
                "trip_days": days,
                "source_country": src,
                "destination_country": dst,
                "travel_type": ttype,
                "season": season,
            }
        )
        y.append(cost)

    return X, y


def _train_model() -> Pipeline:
    X, y = _synthetic_training_data()
    model = Pipeline(
        steps=[
            ("vec", DictVectorizer(sparse=False)),
            ("lr", LinearRegression()),
        ]
    )
    model.fit(X, y)
    return model


def load_or_train_model() -> Pipeline:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

    if MODEL_PATH.exists():
        return joblib.load(MODEL_PATH)

    model = _train_model()
    joblib.dump(model, MODEL_PATH)
    return model


model = load_or_train_model()

app = FastAPI(title="GlobeTrotter Budget Estimator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    features = {
        "trip_days": req.trip_days,
        "source_country": req.source_country.strip(),
        "destination_country": req.destination_country.strip(),
        "travel_type": req.travel_type,
        "season": req.season,
    }

    pred = float(model.predict([features])[0])
    pred = max(0.0, pred)
    return PredictResponse(estimated_total_cost=pred)