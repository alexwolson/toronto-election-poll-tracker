#!/usr/bin/env python3
"""FastAPI backend for Toronto Election Projection Tool."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import wards, polls, refresh

app = FastAPI(
    title="Toronto 2026 Election Projections",
    description="Ward-level council race projections and mayoral polling",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(wards.router, prefix="/api/wards", tags=["wards"])
app.include_router(polls.router, prefix="/api/polls", tags=["polls"])
app.include_router(refresh.router, prefix="/api", tags=["admin"])


@app.get("/")
def root():
    return {"status": "ok", "message": "Toronto 2026 Election Projections API"}


@app.get("/api/health")
def health():
    return {"status": "healthy"}
