from pathlib import Path

def test_medallion_directories_exist():
    root = Path(__file__).resolve().parents[1] / "medallion"
    assert (root / "bronze").exists()
    assert (root / "silver").exists()
    assert (root / "gold").exists()

def test_spark_pipeline_exists():
    root = Path(__file__).resolve().parents[1]
    assert (root / "spark" / "medallion_pipeline.py").exists()
