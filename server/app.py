import os
import numpy as np
import tensorflow as tf
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
from tensorflow.keras.preprocessing.image import img_to_array
from tensorflow.keras.applications.vgg16 import preprocess_input
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Model and configuration
MODEL_PATH = "model.h5"
CLASS_LABELS = ["Normal", "Glaucoma", "Diabetic Retinopathy", "Cataract"]
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

        logger.info(f"✅ Processed image shape: {img_array.shape}")
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
        logger.warning("❌ No files uploaded")
        return jsonify({"error": "No files uploaded"}), 400

    files = request.files.getlist("files")
    if not files:
        logger.warning("❌ Empty file list")
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

            logger.info(f"📊 Raw Predictions: {probabilities}")

            # Get the original prediction
            predicted_idx = np.argmax(probabilities)
            predicted_label = CLASS_LABELS[predicted_idx]

            logger.info(f"🔹 Original Prediction: {predicted_label}")

            # Swapping logic for labels
            label_mapping = {
                "Glaucoma": "Diabetic Retinopathy",
                "Diabetic Retinopathy": "Glaucoma",
                "Cataract": "Normal",
                "Normal": "Cataract"
            }
            swapped_label = label_mapping.get(predicted_label, predicted_label)

            logger.info(f"🔄 Swapped Prediction: {swapped_label}")

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

def main():
    """
    Start Flask API
    """
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)

if __name__ == "__main__":
    main()