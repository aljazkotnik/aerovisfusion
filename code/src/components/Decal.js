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



// Repackage into lil-gui
const params = {
	minScale: 0.10,
	maxScale: 0.20,
	clear: function () {
		removeDecals();
	}
};



/*
One main idea is that the decal is added to the scene immediately upon creation. The pointer interaction merely selects a new position for the decal to be added to, and the buffer is only updated in the background.
*/
export default class Decal{
	
	constructor( camera, admissibleTargetGeometries ){
		// Camera is required to work with the raypointer.
		let obj = this;
		
		// DECAL HELPER
		// Help position the decal. Should respond to domain size?
		obj.orientationHelper = new THREE.Mesh( new THREE.BoxGeometry( 1, 1, 10 ), 
		new THREE.MeshNormalMaterial() );
		obj.orientationHelper.visible = false;
		
		
		// DECAL MESH
		// The decal mesh requires a material, and a geometry to be combined in a mesh. The texture should be controlled by a UI editor.
		// Rename to DecalTextureEditor?
		obj.editor = new DecalTextureUI( 'assets/20220125_143807.jpg' );
		
		
		// Now make the mesh object itself.
		obj.decal = new DecalMesh( obj.editor.texture );
		
		
		
		// RAYPOINTER
		// The user interaction for the initial positioning.
		obj.raypointer = new DecalPointerRay( camera );
		obj.raypointer.decals = [obj.decal];
		obj.raypointer.geometries = admissibleTargetGeometries;
		obj.raypointer.positionInteraction = function(target){
			obj.position(target);
		} // positionInteraction
		
		
	} // constructor
	
	
	
	position(target){
		// Target is the output of raycaster.checkIntersection();
		let obj = this;
		
		// Reposition the orientation helper. Or maybe this can be done in addDecal?
		obj.orientationHelper.position.copy( obj.raypointer.getLinePoint(0) );
		obj.orientationHelper.lookAt( obj.raypointer.getLinePoint(1) );
		
		// obj.orientationHelper.rotation.z = Math.random() * 2 * Math.PI;
		
		obj.decal.support = target.object;
		obj.decal.position.copy( obj.orientationHelper.position )
		obj.decal.orientation.copy( obj.orientationHelper.rotation )
		obj.decal.scale = params.minScale + Math.random() * ( params.maxScale - params.minScale );
		
		obj.decal.transform()
		
		
	} // position
	
	
	addGUI(gui){
		// lil-gui doesn't allow a new gui to be attached to an existing gui, so instead the container is passed in, and the gui created here, for brevity of code in the main script.
		let obj = this;
		
		const decalEditorItem = gui.addFolder("Decal XY");
		
		const decalEditorItemConfig = {
			show: function(){obj.editor.show()}
		}
		
		decalEditorItem.add( decalEditorItemConfig , "show" )
			
	} // addGUI
	
	
	addTo(sceneWebGL){
		// Helper to add this decal with all its ancilliary geometries to the scene.
		let obj = this;
		
		sceneWebGL.add( obj.orientationHelper )
		sceneWebGL.add( obj.raypointer.line )
		sceneWebGL.add( obj.decal.mesh )
		
	} // addTo
	
	unstick(){
		// In case the user wants to unstick the decal, they really only want to erase the buffer geometry.
		let obj = this;
		obj.decal.mesh.geometry.copy( new THREE.BufferGeometry() );
	} // unstick
	
	removeCompletely(sceneWebGL){
		let obj = this;
		
		// Note that this removes everything, but maybe what the user wanted was to just remove the mesh.
		sceneWebGL.remove( obj.orientationHelper )
		sceneWebGL.remove( obj.raypointer.line )
		sceneWebGL.remove( obj.decal.mesh )
	}
	
	
	
} // Decal