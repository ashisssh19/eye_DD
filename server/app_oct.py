import os
import numpy as np
import tensorflow as tf
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from PIL import Image
from datetime import datetime
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
MODEL_PATH = "resnet50v2_oct_model.h5"
CLASS_LABELS = ["Diabetic Retinopathy", "Normal"]  # OCT model classes
INPUT_SHAPE = (224, 224)  # Ensure the correct input size
OPTIMAL_THRESHOLD = 0.5  # Adjust if needed

# Ensure consistent float precision
tf.keras.backend.set_floatx('float32')

# Load the model once to avoid reloading on every request
try:
    model = tf.keras.models.load_model(MODEL_PATH)
    logger.info("✅ OCT Model loaded successfully!")
    model.summary()  # Log model summary for debugging
except Exception as e:
    logger.error(f"❌ Error loading OCT model: {e}")
    model = None


def preprocess_image(image):
    """
    Convert the uploaded image into a format compatible with the OCT model.
    This function ensures that the preprocessing matches what was used in training.
    """
    try:
        # Resize the image using bicubic resampling to maintain quality
        img_resized = image.resize(INPUT_SHAPE, Image.BICUBIC)
        img_array = np.array(img_resized) / 255.0  # Normalize pixel values
        img_array = np.expand_dims(img_array, axis=0)  # Add batch dimension
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


@app.route("/predict-oct", methods=["POST"])
def predict_oct():
    """
    Handle OCT image upload and predict Diabetic Retinopathy or Normal.
    """
    if model is None:
        return jsonify({"error": "OCT Model failed to load"}), 500

    patient_id = request.form.get("patient_id", "Unknown")
    logger.info(f"📌 OCT Prediction request for Patient ID: {patient_id}")

    if "files" not in request.files:
        return jsonify({"error": "No files uploaded"}), 400

    files = request.files.getlist("files")
    if not files:
        return jsonify({"error": "No files uploaded"}), 400

    predictions = []

    for file in files:
        try:
            # Validate file type
            validate_image_file(file)

            # Load and preprocess the image
            img = Image.open(file.stream).convert("RGB")
            processed_img = preprocess_image(img)

            # Make a prediction
            prediction = model.predict(processed_img)

            # Handle both sigmoid and softmax cases correctly
            if prediction.shape[-1] == 1:
                probability_dr = float(prediction[0][0])  # Single probability (DR confidence)
                probability_normal = 1.0 - probability_dr  # Normal confidence
            else:
                probability_normal = float(prediction[0][0])  # Softmax: Normal class probability
                probability_dr = float(prediction[0][1])  # Softmax: DR class probability

            # Determine the final label
            predicted_label = CLASS_LABELS[0] if probability_normal > probability_dr else CLASS_LABELS[1]

            # Log raw predictions for debugging
            logger.info(f"🖼️ Prediction for {file.filename}: {predicted_label} "
                f"(Probabilities: Normal={probability_normal:.4f}, DR={probability_dr:.4f})")


            # Store result in MongoDB
            history_collection.update_one(
                {"patient_id": patient_id},
                {"$push": {"history": {
                    "date": datetime.utcnow(),
                    "scan_type": "OCT Scan",
                    "diagnosis": predicted_label,
                    "raw_prediction": prediction[0].tolist()  # Store full prediction values for debugging
                }}},
                upsert=True
            )

            predictions.append({
                "filename": file.filename,
                "disease": predicted_label,
                "probability": probability_dr
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
    port = int(os.environ.get("PORT", 5001))  # Different port from main app
    app.run(host="0.0.0.0", port=port, debug=False)


if __name__ == "__main__":
    main()
