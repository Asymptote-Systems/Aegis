import time
from sqlalchemy import text
from sqlalchemy.exc import OperationalError
from sqlalchemy.engine import Engine

def wait_for_db(engine: Engine, timeout: int = 60, interval: float = 1.5) -> None:
    """
    Poll the database until it's ready or until timeout.
    """
    deadline = time.time() + timeout
    last_err: Exception | None = None
    while time.time() < deadline:
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return
        except OperationalError as e:
            last_err = e
            time.sleep(interval)
    raise RuntimeError(f"Database not ready after {timeout}s") from last_err
