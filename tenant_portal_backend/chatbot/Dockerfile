FROM python:3.11-slim

WORKDIR /app

COPY chatbot/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY __init__.py /app/tenant_portal_backend/__init__.py
COPY chatbot /app/tenant_portal_backend/chatbot

ENV PYTHONPATH=/app

EXPOSE 9000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:9000/health')" || exit 1

CMD ["uvicorn", "tenant_portal_backend.chatbot.service:app", "--host", "0.0.0.0", "--port", "9000"]
