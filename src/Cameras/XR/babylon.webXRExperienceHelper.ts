module BABYLON {
    /**
     * Helper class used to enable XR
     * @see https://doc.babylonjs.com/how_to/webxr
     */
    export class WebXRExperienceHelper {
        /**
         * Container which stores the xr camera and controllers as children. This can be used to move the camera/user as the camera's position is updated by the xr device
         */
        public container:AbstractMesh;
        /**
         * Camera used to render xr content
         */
        public camera:WebXRCamera;

        /** 
         * If XR mode has completed being entered 
         * After calling enterXR() this will be false until the returned promise is resolved 
         */
        public isInXRMode = false;
        /** 
         * If this is transitioning XR modes
         * After calling enterXR() this will be true until the returned promise is resolved, then it will be false 
         */
        public isInStateTransition = false;
        
        private _sessionManager:WebXRSessionManager;

        private _nonVRCamera:Nullable<Camera> = null;
        private _originalSceneAutoClear = true;

        private _outputCanvas:HTMLCanvasElement;
        private _outputCanvasContext:WebGLRenderingContext;

        /**
         * Creates a WebXRExperienceHelper
         * @param scene The scene the helper should be created in
         */
        constructor(private scene:BABYLON.Scene){
            this.camera = new BABYLON.WebXRCamera("", scene);
            this._sessionManager = new BABYLON.WebXRSessionManager(scene);
            this.container = new AbstractMesh("", scene);
            this._sessionManager.initialize()
        }

        /**
         * Exits XR mode and returns the scene to its original state
         */
        public exitXR(){
            this.isInStateTransition = true;
            return this._sessionManager.exitXR()
        }

        /**
         * Enters XR mode
         * @param sessionCreationOptions options for the XR session 
         * @param frameOfReference frame of reference of the XR session
         */
        public enterXR(sessionCreationOptions:XRSessionCreationOptions, frameOfReference:string){
            this.isInStateTransition = true;

            this._createCanvas();
            if(!sessionCreationOptions.outputContext){
                sessionCreationOptions.outputContext = this._outputCanvasContext;
            }

            return this._sessionManager.enterXR(sessionCreationOptions, frameOfReference).then(()=>{                
                // Cache pre xr scene settings
                this._originalSceneAutoClear = this.scene.autoClear;
                this._nonVRCamera = this.scene.activeCamera;

                // Overwrite current scene settings
                this.scene.autoClear = false;
                this.scene.activeCamera = this.camera

                this._sessionManager.onXRFrameObservable.add(()=>{
                    this.camera.updateFromXRSessionManager(this._sessionManager)
                });

                this._sessionManager.onXRSessionEnded.addOnce(()=>{
                    // Reset camera rigs output render target to ensure sessions render target is not drawn after it ends
                    this.camera.rigCameras.forEach((c)=>{
                        c.outputRenderTarget = null;
                    });

                    // Restore scene settings
                    this.scene.autoClear = this._originalSceneAutoClear;
                    this.scene.activeCamera = this._nonVRCamera;
                    this._sessionManager.onXRFrameObservable.clear();
                    this._removeCanvas();

                    this.isInStateTransition = false;
                    this.isInXRMode = false;
                })
                this.isInStateTransition = false;
                this.isInXRMode = true;
            })
        }

        // create canvas used to mirror/vr xr content in fullscreen
        private _createCanvas(){
            this._removeCanvas();
            this._outputCanvas = document.createElement('canvas');
            this._outputCanvas.style.cssText = "position:absolute; bottom:0px;right:0px;z-index:10;width:100%;height:100%;background-color: #48989e;";
            document.body.appendChild(this._outputCanvas);
            this._outputCanvasContext = <any>this._outputCanvas.getContext('xrpresent')
        }
        private _removeCanvas(){
            if(this._outputCanvas && document.body.contains(this._outputCanvas)){
                document.body.removeChild(this._outputCanvas);
            }
        }
    }
}