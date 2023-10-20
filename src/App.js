import React, { useState, useRef, useEffect, useCallback } from 'react';
import Quagga from '@ericblade/quagga2';
import Scanner from './Scanner';
import Result from './Result';

const App = () => {
    const [scanning, setScanning] = useState(false); // toggleable state for "should render scanner"
    const [cameras, setCameras] = useState([]); // array of available cameras, as returned by Quagga.CameraAccess.enumerateVideoDevices()
    const [cameraId, setCameraId] = useState(null); // id of the active camera device
    const [cameraError, setCameraError] = useState(null); // error message from failing to access the camera
    const [results, setResults] = useState([]); // list of scanned results
    const [code, setCode] = useState(null);
    const scannerRef = useRef(null); // reference to the scanner element in the DOM

    // at start, we need to get a list of the available cameras.  We can do that with Quagga.CameraAccess.enumerateVideoDevices.
    // HOWEVER, Android will not allow enumeration to occur unless the user has granted camera permissions to the app/page.
    // AS WELL, Android will not ask for permission until you actually try to USE the camera, just enumerating the devices is not enough to trigger the permission prompt.
    // THEREFORE, if we're going to be running in Android, we need to first call Quagga.CameraAccess.request() to trigger the permission prompt.
    // AND THEN, we need to call Quagga.CameraAccess.release() to release the camera so that it can be used by the scanner.
    // AND FINALLY, we can call Quagga.CameraAccess.enumerateVideoDevices() to get the list of cameras.

    // Normally, I would place this in an application level "initialization" event, but for this demo, I'm just going to put it in a useEffect() hook in the App component.

    useEffect(() => {
        const enableCamera = async () => {
            await Quagga.CameraAccess.request(null, {
                audio: false,
                video: isMobile2() ? {
                    facingMode: {
                        exact: 'environment',
                    },
                } : true,
            } );
        };
        const disableCamera = async () => {
            await Quagga.CameraAccess.release();
        };
        const enumerateCameras = async () => {
            const cameras = await Quagga.CameraAccess.enumerateVideoDevices();
            console.log('Cameras Detected: ', cameras);
            return cameras;
        };
        enableCamera()
        .then(disableCamera)
        .then(enumerateCameras)
        .then((cameras) => setCameras(cameras))
        .catch((err) => setCameraError(err));
        return () => disableCamera();
    }, []);

    return (
        <div>
            {cameraError ? <p>ERROR INITIALIZING CAMERA ${JSON.stringify(cameraError)} -- DO YOU HAVE PERMISSION?</p> : null}
            {cameras.length === 0 ? <p>Enumerating Cameras, browser may be prompting for permissions beforehand</p> :
                <form>
                    <select onChange={(event) => setCameraId(event.target.value)}>
                        {cameras.map((camera) => (
                            <option key={camera.deviceId} value={camera.deviceId}>
                                {camera.label || camera.deviceId}
                            </option>
                        ))}
                    </select>
                </form>
            }
            <button
                onClick={() => {
                    setScanning(!scanning);
                    setResults( [] );
                } }
            >
                {scanning ? 'Stop' : 'Start'}
            </button>
            {
                code && (
                    <div>
                        <h3>
                            Result
                        </h3>
                        <p>
                            { code }
                        </p>
                    </div>
                )
            }
            <ul className="results">
                {results.map((result) => (result.codeResult && <Result key={result.codeResult.code} result={result} />))}
            </ul>
            <div ref={scannerRef} style={{position: 'relative'}}>
                <canvas className="drawingBuffer" style={{
                    position: 'absolute',
                    top: '0px',
                }} width="640" height="480" />
                {
                    scanning ?
                        <Scanner
                            scannerRef={scannerRef}
                            cameraId={cameraId}
                            onDetected={(result) => {
                                setResults([...results, result]);
                                setScanning( false );
                                if (result.codeResult && result.codeResult.code) {
                                    setCode( result.codeResult.code );
                                }
                            }}
                        /> :
                        null
                }
            </div>
        </div>
    );
};

export default App;

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);
}

function isMobile2() {
    return isMobile() || /Windows Mobile|iemobile|Puffin|Silk|Opera Mini/i.test( navigator.userAgent );
}