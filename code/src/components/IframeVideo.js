import * as THREE from "three";
import { CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";

function makeCSS3DiFrame( id, w, x, y, z, rx, ry, rz ) {
	
	/*
	SIZING
	
	The iFrame renders the video depending on the pixel width and height it is given - small pixel sizes will have less resolution, and fewer controls. Therefore 480px/360px are hardcoded as the width and height.
	
	By default the pixel distances are converted into world distances as 1-to-1, meaning that a 480px wide iFrame will occupy 480 world units by its width. The appropriate scaling can be done by scale.set() on the CSS3DObject.
	*/
	
	// Assume from the start a wideo with a width of 480px and height of 360 px, but then rescale it.
	// Will this affect the resolution?
	let k = w/480;
	let width = '480px';
	let height = '360px';

	const div = document.createElement( 'div' );
	div.style.width = width;
	div.style.height = height;
	div.style.backgroundColor = '#000';
	div.style.opacity = 1; // 0.5;

	const iframe = document.createElement( 'iframe' );
	iframe.style.width = width;
	iframe.style.height = height;
	iframe.style.border = '0px';
	iframe.src = [ 'https://www.youtube.com/embed/', id, '?rel=0' ].join( '' );
	div.appendChild( iframe );

	const object = new CSS3DObject( div );
	object.scale.set( k, k, k )
	object.position.set( x, y, z );
	object.rotation.set( rx, ry, rz );

	return object;

} // makeCSS3DiFrame


export default class IframeVideo{
	constructor( id, w, x, y, z, rx, ry, rz ){
		let obj = this;
		
		
		obj.config = {
			name: "..."+id.slice(-27),
			visible: true,
			positioning: false,
			remove: function(){}
		}
		
		
		let videoIframe = makeCSS3DiFrame( id, w, x, y, z, rx, ry, rz );
		videoIframe.name = id + "CSS";
		
		// Also need to add in the corresponding cutting plane to the regular scene.
		var webGLPlaneMaterial = new THREE.MeshPhongMaterial({
			opacity	: 0.01,
			color	: new THREE.Color( 0xffffff ),
			blending: THREE.NoBlending,
			side	: THREE.DoubleSide,
		});
		var webGLCutPlaneGeometry = new THREE.PlaneGeometry( 480, 360 );
		var webGLCutPlaneMesh = new THREE.Mesh( webGLCutPlaneGeometry, webGLPlaneMaterial );
		webGLCutPlaneMesh.name = id + "WebGL";
		
		webGLCutPlaneMesh.position.copy( videoIframe.position );
		webGLCutPlaneMesh.rotation.copy( videoIframe.rotation );
		webGLCutPlaneMesh.scale.copy( videoIframe.scale );
		
		webGLCutPlaneMesh.castShadow = false;
		webGLCutPlaneMesh.receiveShadow = true;
	
	
		obj.webGLItem = webGLCutPlaneMesh;
		obj.cssItem = videoIframe;
	} // constructor
	
	
	ontransform(){
		let obj = this;
		// The CSS item is repositioned with the controls, but the webGL item must shadow it.
		obj.webGLItem.position.copy( obj.cssItem.position );
		obj.webGLItem.rotation.copy( obj.cssItem.rotation );
		obj.webGLItem.scale.copy( obj.cssItem.scale );
		
	} // ontransform
	
} // IframeVideo