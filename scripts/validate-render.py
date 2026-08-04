#!/usr/bin/env python3
"""Fail CI when emulator screenshots do not contain plausible rendered game frames."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter, ImageStat


def ratio(count: int, total: int) -> float:
    return count / total if total else 0.0


def analyze(path: Path) -> dict[str, float | int | str]:
    with Image.open(path) as source:
        image = source.convert("RGB")

    width, height = image.size
    if width < 1000 or height < 500:
        raise AssertionError(f"{path}: screenshot is unexpectedly small: {width}x{height}")
    if width <= height:
        raise AssertionError(f"{path}: game is not rendered in landscape: {width}x{height}")

    sample = image.resize((320, 180))
    pixels = list(sample.getdata())
    total = len(pixels)

    brightness_values = [sum(pixel) / 3 for pixel in pixels]
    brightness = sum(brightness_values) / total
    variance = sum((value - brightness) ** 2 for value in brightness_values) / total
    standard_deviation = math.sqrt(variance)
    unique_colors = len(set(pixels))

    non_black = sum(1 for r, g, b in pixels if max(r, g, b) >= 22)
    cyan_blue = sum(1 for r, g, b in pixels if b >= 120 and g >= 70 and b > r * 1.08)
    warm = sum(1 for r, g, b in pixels if r >= 150 and r > b * 1.18)
    yellow = sum(1 for r, g, b in pixels if r >= 150 and g >= 105 and b <= 145)

    edges = sample.filter(ImageFilter.FIND_EDGES)
    edge_brightness = ImageStat.Stat(edges.convert("L")).mean[0]

    checks = {
        "non_black_ratio": ratio(non_black, total),
        "cyan_blue_ratio": ratio(cyan_blue, total),
        "warm_ratio": ratio(warm, total),
        "yellow_ratio": ratio(yellow, total),
    }

    if not 12 <= brightness <= 215:
        raise AssertionError(f"{path}: implausible mean brightness {brightness:.2f}")
    if standard_deviation < 22:
        raise AssertionError(f"{path}: frame has too little contrast, stddev={standard_deviation:.2f}")
    if unique_colors < 1400:
        raise AssertionError(f"{path}: frame has too few colors ({unique_colors}), likely blank or broken")
    if checks["non_black_ratio"] < 0.35:
        raise AssertionError(f"{path}: too much of the frame is blank or black")
    if checks["cyan_blue_ratio"] < 0.015:
        raise AssertionError(f"{path}: expected blue or cyan game content was not rendered")
    if edge_brightness < 5:
        raise AssertionError(f"{path}: frame lacks rendered edges and detail ({edge_brightness:.2f})")

    return {
        "file": str(path),
        "width": width,
        "height": height,
        "mean_brightness": round(brightness, 2),
        "brightness_stddev": round(standard_deviation, 2),
        "unique_colors_320x180": unique_colors,
        "edge_mean": round(edge_brightness, 2),
        **{key: round(value, 4) for key, value in checks.items()},
    }


def frame_difference(first: Path, second: Path) -> float:
    with Image.open(first) as left_source, Image.open(second) as right_source:
        left = left_source.convert("RGB").resize((320, 180))
        right = right_source.convert("RGB").resize((320, 180))
    difference = ImageChops.difference(left, right)
    return sum(ImageStat.Stat(difference).mean) / 3


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("screenshots", nargs="+", type=Path)
    parser.add_argument("--report", type=Path, default=Path("artifacts/render-analysis.json"))
    args = parser.parse_args()

    missing = [str(path) for path in args.screenshots if not path.exists()]
    if missing:
        raise AssertionError(f"Missing screenshots: {', '.join(missing)}")

    results = [analyze(path) for path in args.screenshots]
    gameplay_results = [result for result in results if "gameplay-" in str(result["file"])]
    if len(gameplay_results) < 2:
        raise AssertionError("At least two gameplay screenshots are required")

    if max(float(result["warm_ratio"]) for result in gameplay_results) < 0.004:
        raise AssertionError("No gameplay frame contains the expected warm ship or hazard rendering")
    if max(float(result["yellow_ratio"]) for result in results) < 0.002:
        raise AssertionError("No captured frame contains the expected yellow star or score rendering")

    differences = []
    for first, second in zip(args.screenshots, args.screenshots[1:]):
        value = frame_difference(first, second)
        differences.append({"from": str(first), "to": str(second), "mean_pixel_difference": round(value, 2)})

    if not any(item["mean_pixel_difference"] >= 4 for item in differences):
        raise AssertionError("Captured screens are effectively identical, navigation or gameplay did not render")

    report = {"screenshots": results, "frame_differences": differences}
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"render validation failed: {error}", file=sys.stderr)
        raise
