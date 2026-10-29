import pytest
from urllib.parse import quote_plus

from app.db.db_config import PostgresConfig

# Tests
@pytest.mark.unit
def test_postgres_config_default_values():
    """Test that PostgresConfig sets default values correctly"""
    # given
    config = PostgresConfig(
        db_name="testdb",
        user="testuser",
        password="testpass"
    )
    
    # then
    assert config.server == "localhost"
    assert config.port == 5432
    assert config.db_name == "testdb"
    assert config.user == "testuser"
    assert config.password == "testpass"

@pytest.mark.unit
def test_postgres_config_custom_values():
    """Test that PostgresConfig accepts custom values"""
    # given
    config = PostgresConfig(
        server="custom-server",
        port=5433,
        db_name="customdb",
        user="customuser",
        password="custompass"
    )
    
    # then
    assert config.server == "custom-server"
    assert config.port == 5433
    assert config.db_name == "customdb"
    assert config.user == "customuser"
    assert config.password == "custompass"

@pytest.mark.unit
def test_get_connection_url_basic():
    """Test that get_connection_url formats the connection string correctly"""
    # given
    config = PostgresConfig(
        server="localhost",
        port=5432,
        db_name="testdb",
        user="testuser",
        password="testpass"
    )
    
    # when
    url = config.get_connection_url()
    
    # then
    assert url == "postgresql://testuser:testpass@localhost:5432/testdb"

@pytest.mark.unit
def test_get_connection_url_with_special_chars():
    """Test that get_connection_url properly encodes special characters in password"""
    # given
    special_password = "test@pass&with:special/chars"
    config = PostgresConfig(
        db_name="testdb",
        user="testuser",
        password=special_password
    )
    
    # when
    url = config.get_connection_url()
    expected_encoded_password = quote_plus(special_password)
    
    # then
    assert url == f"postgresql://testuser:{expected_encoded_password}@localhost:5432/testdb"
    # Verify the password is properly encoded
    assert expected_encoded_password in url
