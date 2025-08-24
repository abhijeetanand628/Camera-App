import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal} from 'react-native';
import { CameraView, useCameraPermissions, CameraCapturedPicture, BarcodeScanningResult } from "expo-camera";
import Slider from "@react-native-community/slider";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function CameraTab() {
    const [facing, setFacing] = useState<"back" | "front">("back"); // Tells which camera is active. It is initially set to BACK.
    const [zoom, setZoom] = useState(0);
    const [capturedphotos, setCapturedPhotos] = useState<Array<{uri: string}>>(
        [] // This Array stores the URI's of the photos we take.
    );
    const [permission, requestPermission] = useCameraPermissions(); // useCameraPermissions() is an Expo hook that returns permission state
    const [isBarCode, setIsBarCode] = useState(false);
    const [barCodeResult, setBarCodeResult] = useState<string | null>(null);
    const cameraRef = useRef<CameraView>(null); // It allows us to directly interact with our camera.

    useEffect(() => {
        loadSavedPhotos();
    }, []);

    const loadSavedPhotos = useCallback(async() => {
        try {
            const savedPhotos = await AsyncStorage.getItem("capturedPhotos");
            if(savedPhotos) {
                setCapturedPhotos(JSON.parse(savedPhotos));
            }
        } catch(error) {
            console.error("Failed to Load Photos", error);
        }
    }, []);

    const savePhotos = useCallback(
        async (newPhoto: {uri: string}) =>{
            try {
                const updatedPhotos = [newPhoto, ...capturedPhotos];
                await AsyncStorage.setItem(
                    "capturedPhotos",
                    JSON.stringify(updatedPhotos)
                );
                setCapturedPhotos(updatedPhotos);
            } catch(error) {
                console.error("Failed to Save Photo", error);
            }
        },
        [capturedphotos]
    );

    const toggleCameraFacing = useCallback(() => {
        setFacing((current) => (current === "back" ? "front" : "back"));
    }, []);

    const handleZoomChange = useCallback((value: number) => {
        setZoom(value);
    }, []);

    const takePicture = useCallback(async () => {
        if(cameraRef.current) {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 1,
                base64: false,
                exif: false,
            });
            await savePhoto({uri: photo.uri});
        }
    }, [savePhoto]);

    const toggleBarcodeMode = useCallback(() => {
        setIsBarCode((prev) => !prev);
    }, []);

    const handleBarCodeScanned = useCallback(
        ({data} : BarcodeScanningResult) => {
            setBarCodeResult(data);
        }, []);

        if(!permission) {
            return <View />;
        }

        if(permission.granted) {
            return (
                <View style={StyleSheet.container}>
                    <Text style={styles.text}>
                        We need to your permission to show the camera
                    </Text>
                    <TouchableOpacity style={styles.button} onPress={requestPermission}>
                        <Text style={StyleSheet.buttonText}>Grant Permission</Text>
                    </TouchableOpacity>
                </View>
            )
        }

        return (
            <View style={styles.container}>
                <CameraView
                    ref={cameraRef}
                    styles={styles.camera}
                    facing={facing}
                    zoom={zoom}
                    barcodeScannerSettings={{
                        barCodeTypes: [
                            "qr",
                            "ean13",
                            "ean8",
                            "pdf417",
                            "aztec",
                            "datamatrix",
                        ],
                    }}
                    onBarcodeScanned={isBarcodeMode ? handleBarCodeScanned : undefined}
                >
                    <View style={styles.controlContainer}>
                        <View style={styles.row}>
                            <TouchableOpacity
                                style={styles.button}
                                onPress={toggleCameraFacing}
                            >
                                <Text style={styles.buttonText}>Flip</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={StyleSheet.button} onPress={toggleBarcodeMode}>
                                <Text style={styles.buttonText}>
                                    {isBarcodeMode ? "Photo Mode" : "Barcode Mode"} 
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.text}>Zoom: {zoom.toFixed(1)}x</Text>
                            <Slider
                                style={styles.slider}
                                minimumValue={0}
                                maximumValue={1}
                                value={zoom}
                                onValueChange={handleZoomChange}
                            />
                        </View>
                        {!BarcodeMode && (
                            <View style={styles.row}>
                                <TouchableOpacity 
                                    style={styles.captureButton}
                                    onPress={takePictre}
                                >
                                    <Text style={styles.captureButtonText}>Take Photo</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </CameraView>
                <Modal 
                    animationType="slide"
                    transparent={true}
                    visible={!!barCodeResult}
                    onRequestClose={() => setBarCodeResult(null)}
                >
                    <View style={styles.modalView}>
                        <Text style={styles.modalText}>Barcode Detected:</Text>
                        <Text style={styles.barcodeText}>{barCodeResult}</Text>
                        <TouchableOpacity
                            style={[styles.button, styles.buttonClose]}
                            onPress={() => setBarCodeResult(null)}
                        >
                            <Text style={styles.buttonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </Modal> 
            </View>
        )