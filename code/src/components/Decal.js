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
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";
const textureLoader = new THREE.TextureLoader();





// Parameters from the UI - repackage into class?
const params = {
	minScale: 0.10,
	maxScale: 0.20,
	clear: function () {
		removeDecals();
	}
};




export default class Decal{
	
	// Each decal is expected to be placed only once.
	position = new THREE.Vector3()
	orientation = new THREE.Euler()
	scale = 10;
	size = new THREE.Vector3( 10, 10, 10 )
	
	constructor(){
		let obj = this;
		
		
		// Create the raycaster.
		/*
		BEHAVIOR:
		- click and drag should support OrbitControls without pasting the decal.
		- so store moved as before, and only past on pointerup?
		*/
		
		
		
		const decalDiffuse = textureLoader.load( 'assets/oil_flow_half.png' );
		// const decalDiffuse = textureLoader.load( 'assets/decal-diffuse.png' );
		// const decalNormal = textureLoader.load( 'assets/decal-normal.jpg' );

		// normalMap: decalNormal,
		const decalMaterial = new THREE.MeshBasicMaterial( {
			map: decalDiffuse,
			alphaMap: decalDiffuse,
			transparent: true,
			depthTest: true,
			depthWrite: false,
			polygonOffset: true,
			polygonOffsetFactor: - 4,
			wireframe: false
		} );
		const placeholderGeometry = new THREE.BufferGeometry();
		
		
		obj.mesh = new THREE.Mesh( placeholderGeometry, decalMaterial );
		
		
		
	} // constructor
	
	
	transform(){
		// Add a new instance of hte decal of this type.
		let obj = this;
		
		// Reset the size in case scale changed.
		obj.size.set( obj.scale, obj.scale, obj.scale );

		// Make the decal object.
		const cutout = new DecalGeometry( obj.support, obj.position, obj.orientation, obj.size );		
		obj.mesh.geometry.copy(cutout);
		
	} // transform
	
	
	
	
	highlight(){
		// Highlight this particular decal.
		let obj = this;
		obj.decalmesh.material.emissive.setHex(0x000000);
	} // highlight
	
	
	
	
} // Decal