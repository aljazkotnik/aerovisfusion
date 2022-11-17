import * as THREE from "three";
import { trimStringToLength } from "../helpers.js";

export default class StaticImage{
	constructor(id, w, x, y, z, rx, ry, rz){
		let obj = this;
		
		obj.config = {
			name: id,
			opacity: 1,
			positioning: false,
			remove: function(){}
		}
				
		
		// The static image GUI only needs to select the appropriate file, and it needs to allow the image to be toggled off/on, and switch to this element being repositioned. It should also be named. It needs to be deletable!!
		
		// The initial position should be picked automatically. At some distance in front of the camera?
		
		
		// Add in the schlieren image as well. Use the loaded image width and height to size the plane hosting it.
		obj.created = new Promise(function(resolve,reject){
			
			const im = new THREE.TextureLoader().load( id, function(texture){
			
				const geometry = new THREE.PlaneGeometry( texture.image.width, texture.image.height );
				const material = new THREE.MeshBasicMaterial( { 
					map: texture,
					side: THREE.DoubleSide		
				} );
				const webGLImage = new THREE.Mesh( geometry, material );
				webGLImage.name = id;
				
				// Calculate the scaing required to bring the image to the desired size. Size it so that the width reaches the specified 'w' value.
				let k = w/texture.image.width;
				
				
				webGLImage.position.set( x, y, z );
				webGLImage.rotation.set( rx, ry, rz );
				webGLImage.scale.set( k, k, k );
				
				
				// To seet opacity:
				webGLImage.material.transparent = true;
				webGLImage.material.opacity = 1;
				
				resolve( webGLImage )
			}); // load
			
		}); // new Promise
		
		
	} // constructor
	
	
	
	setOpacity(v){
		let obj = this;
		obj.created.then( webGLImage=>{
			webGLImage.material.transparent = true;
			webGLImage.material.opacity = v;
		})
	} // setOpacity
	
	
	
	addTo(sceneWebGL){
		let obj = this;

		obj.created.then( webGLImage=>{
			sceneWebGL.add( webGLImage );
		}); // then
		
		
		obj.config.remove = function(){
			obj.created.then( webGLImage=>{
				obj.gui.destroy();
				sceneWebGL.remove( webGLImage );
			}); // then
		} // remove
	} // addTo
	
	
	
	addGUI( elementsGUI ){
		let obj = this;
		
		// Add GUI controllers.
		obj.gui = elementsGUI.addFolder( "Image: " + trimStringToLength(obj.config.name , 30) );
		
		let oc = obj.gui.add( obj.config, "opacity", 0, 1); // slider
		let tc = obj.gui.add( obj.config, "positioning" ); // boolean
		obj.gui.add( obj.config, "remove" );      // button
		
		
		oc.onChange(function(v){
			obj.setOpacity(v);
		})
		
		
		
	} // addGUI
	
	
	
} // StaticImage