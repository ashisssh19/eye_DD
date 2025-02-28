from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import numpy as np
from PIL import Image
import io
import os

app = Flask(__name__)
CORS(app)

# Load the Keras model
MODEL_PATH = "model.h5"
model = tf.keras.models.load_model(MODEL_PATH)
print("Model loaded successfully!")

# Original class labels
original_class_labels = ["Normal", "Glaucoma", "Diabetic Retinopathy", "Cataract"]

# Corrected class mapping based on observed behavior
# If normal is predicted as glaucoma, glaucoma as glaucoma, 
# diabetic retinopathy as glaucoma, and cataract as normal
# then the mapping might be:
# Index 0 (model outputs 0) → Glaucoma (for Normal, Glaucoma, and Diabetic Retinopathy)
# Index 1 (model outputs 1) → Normal (for Cataract)
corrected_class_mapping = {
    0: "Glaucoma",  # Index 0 seems to be mapping to Glaucoma
    1: "Normal",    # Index 1 seems to be mapping to Normal
    2: "Diabetic Retinopathy",  # Adjust these as needed
    3: "Cataract"   # Adjust these as needed
}

# Function to process image
def process_image(img_file):
    # Read image using PIL
    img = Image.open(img_file)
    
    # Convert to RGB
    if img.mode != "RGB":
        img = img.convert("RGB")
    
    # Resize to model input size
    img = img.resize((224, 224))
    
    # Convert to array and normalize
    img_array = np.array(img).astype('float32') / 255.0
    
    # Add batch dimension
    img_array = np.expand_dims(img_array, axis=0)
    
    return img_array

@app.route("/predict", methods=["POST"])
def predict():
    if "images" not in request.files:
        return jsonify({"error": "No images provided"}), 400

    images = request.files.getlist("images")
    predictions = []
    raw_predictions = []
    
    # Get patient ID if provided
    patient_id = request.form.get("patientId", "Unknown")

    for i, img_file in enumerate(images):
        try:
            # Save the image temporarily
            temp_path = f"temp_image_{i}.jpg"
            with open(temp_path, "wb") as f:
                f.write(img_file.read())
            
            # Process image
            img_file = open(temp_path, "rb")
            img_array = process_image(img_file)
            
            # Make prediction
            prediction = model.predict(img_array)
            print(f"Raw prediction for image {i+1}: {prediction}")
            
            # Get the raw index and probability values
            predicted_class_idx = np.argmax(prediction[0])
            raw_predictions.append({
                "image": i+1,
                "raw_index": int(predicted_class_idx),
                "raw_values": [float(x) for x in prediction[0]]
            })
            
            # Map to correct class based on observed behavior
            # Using the original mapping first
            original_class = original_class_labels[predicted_class_idx]
            
            # Try to determine the actual class based on the observed pattern
            if original_class == "Normal":
                actual_class = "Glaucoma"  # You mentioned Normal is predicted as Glaucoma
            elif original_class == "Glaucoma":
                actual_class = "Glaucoma"  # This one is correct
            elif original_class == "Diabetic Retinopathy":
                actual_class = "Glaucoma"  # You mentioned DR is predicted as Glaucoma
            elif original_class == "Cataract":
                actual_class = "Normal"  # You mentioned Cataract is predicted as Normal
            else:
                actual_class = "Unknown"
                
            # Also try the corrected mapping approach
            corrected_class = corrected_class_mapping.get(predicted_class_idx, "Unknown")
            
            # Add both to predictions for comparison
            predictions.append({
                "image": i+1,
                "raw_prediction_index": int(predicted_class_idx),
                "original_mapping": original_class,
                "pattern_based_mapping": actual_class,
                "corrected_mapping": corrected_class
            })
            
            # Clean up
            img_file.close()
            os.remove(temp_path)
            
        except Exception as e:
            print(f"Error processing image {i+1}: {str(e)}")
            predictions.append({
                "image": i+1,
                "error": str(e)
            })

    # Return detailed information to help diagnose the issue
    return jsonify({
        "patientId": patient_id,
        "predictions": predictions,
        "raw_predictions": raw_predictions,
        "note": "This response includes multiple mapping approaches to help diagnose the class mapping issue."
    })

# Simple test endpoint with fixed test images
@app.route("/test", methods=["GET"])
def test():
    """Test the model with known test images"""
    return jsonify({
        "status": "Use POST /predict endpoint with actual eye scan images"
    })

if __name__ == "__main__":
    # Print model information
    print(f"Model input shape: {model.input_shape}")
    print(f"Model output shape: {model.output_shape}")
    print(f"Original class labels: {original_class_labels}")
    
    app.run(debug=True)