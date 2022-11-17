/*
This is a class that holds everything to do with the decals.

1) Loading decal texture
2) Selecting part of the texture to use as decal.
3) Aiming ray
4) Placing the decal
5) Functionality to reposition the decal


In addition to that:
Get decal color from the original geometry.

*/

import * as THREE from "three";

import DecalPointerRay from "./DecalPointerRay.js";
import DecalMesh from "./DecalMesh.js";
import CustomDecalGeometry from "./CustomDecalGeometry.js";
import DecalTextureUI from "./DecalTextureUI.js"


import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";





/*
One main idea is that the decal is added to the scene immediately upon creation. The pointer interaction merely selects a new position for the decal to be added to, and the buffer is only updated in the background.
*/
export default class Decal{
	
	constructor( assetsource, camera, admissibleTargetGeometries ){
		// Camera is required to work with the raypointer.
		let obj = this;
		obj.assetname = assetsource;
		
		// DECAL HELPER
		// Help position the decal. Should respond to domain size?
		obj.orientationHelper = new THREE.Mesh( new THREE.BoxGeometry( 0.1, 0.1, 0.1 ), 
		new THREE.MeshNormalMaterial() );
		obj.orientationHelper.visible = false;
		
		
		// DECAL MESH
		// The decal mesh requires a material, and a geometry to be combined in a mesh. The texture should be controlled by a UI editor.
		// Rename to DecalTextureEditor?
		obj.editor = new DecalTextureUI( assetsource );
		
		
		// Now make the mesh object itself.
		obj.decal = new DecalMesh( obj.editor.texture, obj.editor.alphatexture );
		
		
		
		// RAYPOINTER
		// The user interaction for the initial positioning.
		obj.raypointer = new DecalPointerRay( camera, admissibleTargetGeometries );
		obj.raypointer.decals = [obj.decal];
		obj.raypointer.positionInteraction = function(target){
			obj.position(target);
		} // positionInteraction
		
		
	} // constructor
	
	
	
	position(target){
		// Target is the output of raycaster.checkIntersection();
		let obj = this;
		
		// Reposition the orientation helper. Keep the previous rotation setting!
		const rotation = obj.orientationHelper.rotation.clone();
		obj.orientationHelper.position.copy( obj.raypointer.getLinePoint(0) );
		obj.orientationHelper.lookAt( obj.raypointer.getLinePoint(1) );
		obj.orientationHelper.rotation.z = rotation.z;
		
		// obj.orientationHelper.rotation.z = Math.random() * 2 * Math.PI;
		
		obj.decal.support = target.object;
		obj.decal.position.copy( obj.orientationHelper.position )
		obj.decal.orientation.copy( obj.orientationHelper.rotation )
		obj.decal.scale = 1;
		
		obj.decal.transform()
		
		
	} // position
	
	
	addGUI(gui){
		// lil-gui doesn't allow a new gui to be attached to an existing gui, so instead the container is passed in, and the gui created here, for brevity of code in the main script.
		
		// I think that transform controls won't really work for decals, because the decal object is not supposed to just be repositioned. Unless it's the orientation helper that is being repositioned....
		let obj = this;
		
		const decalEditorItem = gui.addFolder(`Decal: ${ obj.assetname }`);
		
		const decalEditorItemConfig = {
			editor: function(){obj.editor.show()},
			unpaste: function(){obj.unpaste()},
			rotation: 0,
			size: 1
		}
		
		const rc = decalEditorItem.add( decalEditorItemConfig , "rotation", -15, 15 )
		const sc = decalEditorItem.add( decalEditorItemConfig , "size", 0.9, 1.1 )
		decalEditorItem.add( decalEditorItemConfig , "editor" )
		decalEditorItem.add( decalEditorItemConfig , "unpaste" )
		
		
		
		// Need to know the controller, config, property, callback
		
		function applyIncrementalBehavior(controller, config, property, callback){
			let timer = undefined;
			let rate = undefined;
			function increment(v, callback){
				if(rate == v){
					callback(v);
					timer = setTimeout(function(){increment(v, callback)},200)
				} // if
			} // increment
			
			controller.onChange(function(v){
				clearTimeout(timer);
				rate = v;
				increment(v, callback)
			}).onFinishChange(function(){
				clearTimeout(timer);
				rate = undefined;
				config[property] = ( controller._max + controller._min ) / 2;
				controller.updateDisplay();
			}) // events
		} // applyIncrementalBehavior
		
		
		applyIncrementalBehavior(rc, decalEditorItemConfig, "rotation", function(phi){
			obj.orientationHelper.rotation.z += phi / 360 * 2 * Math.PI;
			obj.decal.orientation.copy( obj.orientationHelper.rotation );
			obj.decal.transform();
		});
		
		applyIncrementalBehavior(sc, decalEditorItemConfig, "size", function(k){
			obj.decal.scale *= k;
			obj.decal.transform();
		});
		
		
		return decalEditorItem;
	} // addGUI
	
	
	addTo(sceneWebGL){
		// Helper to add this decal with all its ancilliary geometries to the scene.
		let obj = this;
		
		sceneWebGL.add( obj.orientationHelper )
		sceneWebGL.add( obj.raypointer.line )
		sceneWebGL.add( obj.decal.mesh )
		
	} // addTo
	
	unpaste(){
		// In case the user wants to unstick the decal, they really only want to erase the buffer geometry.
		let obj = this;
		obj.decal.mesh.geometry.copy( new THREE.BufferGeometry() );
	} // unpaste
	
	removeCompletely(sceneWebGL){
		let obj = this;
		
		// Note that this removes everything, but maybe what the user wanted was to just remove the mesh.
		sceneWebGL.remove( obj.orientationHelper )
		sceneWebGL.remove( obj.raypointer.line )
		sceneWebGL.remove( obj.decal.mesh )
	}
	
	
	
} // Decal