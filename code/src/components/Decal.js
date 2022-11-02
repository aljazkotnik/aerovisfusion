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
import CustomDecalGeometry from "./CustomDecalGeometry.js";


import DecalTextureUI from "./DecalTextureUI.js"

// const textureLoader = new THREE.TextureLoader();









// This will be an instance of a decal, and many decals of the same type will be able to be added.
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
		obj.ui = new DecalTextureUI( 'assets/20220125_143807.jpg' );
		const decalDiffuse = obj.ui.texture;
		
		
		

		
		

	} // constructor
	
	
	
	
	
	
	
} // Decal