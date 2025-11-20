from app.config import get_settings
from app.services.model_loader import ModelLoader


def test_model_loader_fallback():
    loader = ModelLoader(get_settings())
    result = loader.predict({"bedrooms": 2, "bathrooms": 1, "square_feet": 900, "current_rent": 2000})
    assert result > 0
