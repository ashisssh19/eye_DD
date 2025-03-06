import os
import numpy as np
import tensorflow as tf
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from PIL import Image
from datetime import datetime
from tensorflow.keras.preprocessing.image import img_to_array # type: ignore
from tensorflow.keras.applications.vgg16 import preprocess_input # type: ignore
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app, origins="http://localhost:5173", supports_credentials=True)

# Connect to MongoDB
client = MongoClient("mongodb://localhost:27017/")
db = client.eye_scan_db  # Database name
history_collection = db.patient_history  # Collection name

# Model and configuration
MODEL_PATH = "model.h5"
CLASS_LABELS = ["Cataract", "Glaucoma", "Diabetic Retinopathy", "Normal"]
INPUT_SHAPE = (224, 224)

# Load the model once to avoid reloading on every request
try:
    model = tf.keras.models.load_model(MODEL_PATH)
    logger.info("✅ Model loaded successfully!")
except Exception as e:
    logger.error(f"❌ Error loading model: {e}")
    model = None


def preprocess_image(image):
    """
    Convert the uploaded image into a format compatible with VGG16.
    """
    try:
        img_resized = image.resize(INPUT_SHAPE)
        img_array = img_to_array(img_resized)
        img_array = np.expand_dims(img_array, axis=0)  # Add batch dimension
        img_array = preprocess_input(img_array)  # Apply VGG16 preprocessing
        return img_array
    except Exception as e:
        logger.error(f"❌ Image preprocessing error: {e}")
        raise


def validate_image_file(file):
    """
    Validate uploaded image file format.
    """
    allowed_extensions = {"png", "jpg", "jpeg", "bmp", "tiff"}
    filename = file.filename.lower()

    if not filename:
        raise ValueError("Empty filename")

    file_ext = filename.split(".")[-1]
    if file_ext not in allowed_extensions:
        raise ValueError(f"Unsupported file type. Allowed types: {', '.join(allowed_extensions)}")


@app.route("/predict", methods=["POST"])
def predict():
    """
    Handle image upload and predict eye diseases.
    """
    if model is None:
        return jsonify({"error": "Model failed to load"}), 500

    patient_id = request.form.get("patient_id", "Unknown")
    logger.info(f"📌 Prediction request for Patient ID: {patient_id}")

    if "files" not in request.files:
        return jsonify({"error": "No files uploaded"}), 400

    files = request.files.getlist("files")
    if not files:
        return jsonify({"error": "No files uploaded"}), 400

    predictions = []

    for file in files:
        try:
            validate_image_file(file)
            img = Image.open(file.stream).convert("RGB")
            processed_img = preprocess_image(img)

            # Make a prediction
            prediction = model.predict(processed_img)
            probabilities = prediction[0]

            # Get the original prediction
            predicted_idx = np.argmax(probabilities)
            predicted_label = CLASS_LABELS[predicted_idx]

            # Swapping logic for labels
            label_mapping = {
                "Glaucoma": "Diabetic Retinopathy",
                "Diabetic Retinopathy": "Glaucoma",
                "Cataract": "Cataract",
                "Normal": "Normal"
            }
            swapped_label = label_mapping.get(predicted_label, predicted_label)

            # Store in MongoDB
            history_collection.update_one(
                {"patient_id": patient_id},
                {"$push": {"history": {
                    "date": datetime.utcnow(),
                    "scan_type": "Eye Scan",
                    "diagnosis": swapped_label
                }}},
                upsert=True
            )

            predictions.append({
                "filename": file.filename,
                "disease": swapped_label
            })

        except Exception as e:
            logger.error(f"❌ Error processing file {file.filename}: {e}")
            predictions.append({
                "filename": file.filename,
                "disease": "Error",
                "error": str(e)
            })

    return jsonify(predictions)


@app.route("/patient-history/<patient_id>", methods=["GET"])
def get_patient_history(patient_id):
    """
    Retrieve past scan records for a patient.
    """
    patient_record = history_collection.find_one({"patient_id": patient_id}, {"_id": 0})

    if not patient_record:
        return jsonify({"error": "No history found"}), 404

    return jsonify({"history": patient_record.get("history", [])})


def main():
    """
    Start Flask API
    """
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)


if __name__ == "__main__":
    main()