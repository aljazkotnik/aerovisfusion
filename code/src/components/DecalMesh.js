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



// This will be an instance of a decal, and many decals of the same type will be able to be added.
export default class DecalMesh{
	
	// Each decal is expected to be placed only once.
	position = new THREE.Vector3()
	orientation = new THREE.Euler()
	scale = 10;
	size = new THREE.Vector3( 10, 10, 10 )
	support = undefined;
	
	constructor(texture){
		let obj = this;
		
		// const decalDiffuse = textureLoader.load( 'assets/oil_flow_half.png' );
		// const decalDiffuse = textureLoader.load( 'assets/decal-diffuse.png' );
		// const decalNormal = textureLoader.load( 'assets/decal-normal.jpg' );



		// normalMap: decalNormal,
		const decalMaterial = new THREE.MeshBasicMaterial( {
			map: texture,
			alphaMap: texture,
			transparent: true,
			depthTest: true,
			depthWrite: false,
			polygonOffset: true,
			polygonOffsetFactor: - 4,
			wireframe: false,
			blending: THREE.AdditiveBlending
		} );
		const placeholderGeometry = new THREE.BufferGeometry();
		
		
		obj.mesh = new THREE.Mesh( placeholderGeometry, decalMaterial );
		

	} // constructor
	
	
	transform(){
		// Add a new instance of hte decal of this type.
		let obj = this;
		
		// Reset the size in case scale changed.
		obj.size.set( obj.scale, obj.scale, obj.scale );

		// Make the decal object if a support geometry has been prescribed.
		if(obj.support){
			const cutout = new CustomDecalGeometry( obj.support, obj.position, obj.orientation, obj.size );		
			obj.mesh.geometry.copy(cutout)
		} // if
		
	} // transform
	
	

	
	
	
	highlight(active){
		// Highlight this particular decal based on a flag passed in.
		let obj = this;
		obj.mesh.material.color.setHex( active ? 0xff00ff : 0xffffff);
	} // highlight
	
	unhighlight(){
		let obj = this;
		obj.mesh.material.color.setHex(0xffffff);
	} // unhighlight
	
	
} // DecalMesh