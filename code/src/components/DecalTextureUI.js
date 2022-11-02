import * as THREE from "three";

/* What else needs to be done?
- Add a lil gui to the decal manager.
- Toggle the decal gui to adjust the texture
- Restrict the texture to the size of hte image
- Once the submit button is hit, the calculated texture should appear.

- functionality to remove geometries and points. Maybe longclick?
*/


// GUI builder
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import { html2element } from "../helpers.js";


const template = `<div style="display: none;">
<canvas class="editor"></canvas>
<div class="gui" style="position: absolute; top: 10px; right: 10px; text-align: right;"></div>
</div>`


export default class DecalTextureUI{
	constructor(source){
		let obj = this;
		
		// Make a node to which everything is appended.
		obj.node = html2element(template);
		
		
		
		// Create the canvas to draw and edit the texture on.
		let canvas = obj.node.querySelector("canvas")
		// document.createElement('canvas');
		// obj.node.querySelector("div.editor").appendChild(canvas)
		
		obj.texture = new THREE.CanvasTexture(canvas);

		obj.ctx = canvas.getContext('2d');
		let ctx = obj.ctx;
		
		// The canvas width and height should be determined based on hte image aspect ratio.
		ctx.canvas.width = 512; // window.innerWidth;
		ctx.canvas.height = 512; // window.innerHeight;
		
		// Get the raw image.
		obj.rawImage = new ImageTexture(ctx, source);
		
		
		// Configure the editor
		obj.maskUI = new MaskEditor(ctx);
		
		// Prescribe scales so that the mask can remain consistent upon screen resize.
		obj.maskUI.px2unit = function(p){ return obj.rawImage.px2unit(p); };
		obj.maskUI.unit2px = function(p){ return obj.rawImage.unit2px(p); };
		
		// Allow for complete redraw.
		obj.maskUI.onpointermove = function(){
			obj.render();
		}
		
		
		// Add in the GUI.
		const guiconfig = {
			preview: function(){
				// Clear everything
				ctx.reset();
				ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
				
				
				/// draw the shape we want to use for clipping
				obj.maskUI.drawClip();
				
				/// change composite mode to use that shape. Source-over is default
				ctx.globalCompositeOperation = 'source-in';

				/// draw the image to be clipped
				obj.rawImage.draw();
			},
			adjust: function(){
				obj.render();
			},
			submit: function(){
				// When submitting hte preview needs to be drawn, and then the manager needs to be hidden. But the preview twice still doesn't work...
				
				// Would be good to somehow enlarge the clipped are to make the whole canvas area available. Enlarging should be easy, it's more about positioning the clip over the image correctly...
				
				// Would be good if the user could select the center of the decal...
				
				// Calculate a grayscale version of hte image also to aid with the blending!
				
				guiconfig.preview();
				obj.texture.needsUpdate = true;
				obj.hide();
			}
		}; // guiconfig
		
		
		
		// Add a gui before the canvas
		const gui = new GUI({container: obj.node.querySelector("div.gui"), title: "Decal editor"});
		
		gui.add(guiconfig, "preview")
		gui.add(guiconfig, "adjust")
		gui.add(guiconfig, "submit")
		
		
		
	} // constructor
	
	
	render(){
		let obj = this;
		let ctx = obj.ctx;
		
		// Clear canvas.
		ctx.reset();
		ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
		
		
		obj.rawImage.draw();
		obj.maskUI.draw();
	} // render
	
	
	show(){
		let obj = this;
		obj.node.style.display = "";
	} // show
	
	
	hide(){
		let obj = this;
		obj.node.style.display = "none";
	} // hide
	
	resize(w,h){
		// Resize the manager given the width and height of the window.
		
	}
	
} // DecalTextureUI




class Scale{
	range = [0,1]
	domain = [0,1]
	constructor(range,domain){
		let obj = this;
		// Range [px]
		// Domain [data unit]
		obj.range = range ? range : obj.range;
		obj.domain = domain ? domain : obj.domain;
	}
	
	unit2px(v){
		let obj = this;
		let domain = obj.domain;
		let range = obj.range;
		return (v-domain[0])/(domain[1]-domain[0])*(range[1]-range[0])+range[0];
	} // unit2px
	
	px2unit(v){
		let obj = this;
		let domain = obj.domain;
		let range = obj.range;
		return (v-range[0])/(range[1]-range[0])*(domain[1]-domain[0])+domain[0];
	} // px2unit
} // Scale

class ImageTexture{
	
	im = undefined
	ar = 1
	
	constructor(ctx, sourcelink){
		let obj = this;
		obj.ctx = ctx;
		
		
		var im = new Image();
		im.src = sourcelink;
		im.onload = function() {
			obj.im = im;
			
			obj.resize();
			
			obj.draw();
		};
		
		
		// Define the 2 scales to use for non-dimensionalising drawn points.
		obj._xscale = new Scale();
		obj._yscale = new Scale();
		
	} // constructor
	
	
	
	px2unit(p){
		let obj = this;
		
		obj._xscale.range = [0,0+obj.ar*obj.im.width];
		obj._yscale.range = [0,0+obj.ar*obj.im.height];
		
		return [ obj._xscale.px2unit(p[0]), obj._yscale.px2unit(p[1]) ]
	} // px2unit
	
	unit2px(p){
		let obj = this;
		
		obj._xscale.range = [0,0+obj.ar*obj.im.width];
		obj._yscale.range = [0,0+obj.ar*obj.im.height];

		return [ obj._xscale.unit2px(p[0]), obj._yscale.unit2px(p[1]) ]
	} // unit2px
	
	
	draw(){
		let obj = this;
		let ctx = obj.ctx;
		
		if(obj.im){
			// Get the current canvas width and height.
			let cw = ctx.canvas.width;
			let ch = ctx.canvas.height;
			
			// Image size.
			let sw = obj.im.width;
			let sh = obj.im.height;
			
			// If the canvas is resized here, then everything before this point is thrown away!!
			ctx.drawImage(obj.im, 0, 0, sw, sh, 0, 0, cw, ch);
		} // if
	} // draw
	
	
	
	resize(){
		// The maximum size of the canvas has changed. Adjust the canvas to the image size.
		// Set the canvas aspect ratio here.
		let obj = this;
		let ctx = obj.ctx;
		
		let cw = ctx.canvas.width;
		let ch = ctx.canvas.height;
		
		// Draw the image.
		let sw = obj.im.width;
		let sh = obj.im.height;
		
		// Now calculate the aspect ration so the image fits in.
		obj.ar = Math.min( cw/sw, ch/sh);
		let dw = obj.ar*sw;
		let dh = obj.ar*sh;
		
		ctx.canvas.width = dw;
		ctx.canvas.height = dh;
		
	} // resize
	
	
} // ImageTexture


class MaskEditor{
	
	// DONE: Points should be stored in non-dimensional image units
	// Control the drawing of lines first, and only fill when the object is closed.
	// Individual vertices should be adjustable.
	// Allow several geometries to be selected.
	geometries = [[]]
	closed = false;
	
	// Move correction is in image coordinates, but can be prescribed in pixels.
	movecorrection = [0,0]
	selectedgeometries = []
	
	constructor(ctx){
		let obj = this;
		obj.ctx = ctx;
		
		
		// The canvas chould differentiate between click to add a point, and pointerdown and drag to move existing point around.
		
		//
		//ctx.canvas.addEventListener("click", function(event){
		//	console.log( obj.retrieveGeometry(event) );
		//	obj.addPoint(event);
		//})
		
		
		// Ok, on pointerdown I need to find any relevant geometry. Then, on pointerup I need to decide whether to add point, or not. Then I need a way to delete a point also.
			// Configure the interactive adjustment.
		// adjustedGeometry are the points that have been mapped to pixels. Internally the values are kept in image coordinates. Therefore thos values are not changed when adjusting this here.
		let pointerDown = undefined;
		let moved = false;
		
		ctx.canvas.addEventListener("pointerdown", function(event){
			// Register the relevant geometry, and the initial clicked point. But how will the redrawing work? For that I need the original image.
			pointerDown = event;
			moved = false;
			obj.applyGeometrySelection(event);
		})
		
		ctx.canvas.addEventListener("pointermove", function(event){

			if(pointerDown && distPx( obj.event2canvas(pointerDown) , obj.event2canvas(event) )>5**2){
				moved = true;
				
				let p0 = obj.px2unit( obj.event2canvas(pointerDown) )
				let p1 = obj.px2unit( obj.event2canvas(event) );
				
				obj.movecorrection = [p1[0] - p0[0], p1[1] - p0[1]];
				
				obj.onpointermove();
			} // if
		}) // pointermove
		// At move end the correction has to be applied permanently
		ctx.canvas.addEventListener("pointerup", function(event){
			if(!moved){
				obj.addPoint(event)
			}; // if
			obj.applyMoveCorrections();
			pointerDown = undefined;
			moved = false;
		}) // pointerup
		
		ctx.canvas.addEventListener("pointerout", function(event){
			obj.applyMoveCorrections();
			pointerDown = undefined;
			moved = false;
		}) // pointerout
		
	} // constructor
	
	
	
	// DATA INTERFACE
	addPoint(event){
		let obj = this;
		
		// The last element of the geometries array is the current array.
		let current = obj.geometries[obj.geometries.length-1];
		
		// The event position is in pixel.
		let px = obj.event2canvas(event);
					
		
		
		
		// If the point is close enough to existing points, then fill the area.
		obj.closed = current
		  .map( p=>obj.unit2px(p) )
		  .some( p=>((p[0]-px[0])**2 + (p[1]-px[1])**2)<10**2);
		  
		// Furthermore, if the area is closed, then a new area drawing should begin with the next click.
		if(obj.closed){
			current.closed = true;
			obj.geometries.push( [] );
		} else {
			// Store values in non-dim units.
			let pu = obj.px2unit(px);
			current.push( pu );
		} // if

		
		
		// Draw just hte addition
		obj.draw();
		
	} // addPoint
	
	
	/* What kind of interactions do I want to support?
	Click - addPoint
	Click near point and drag - movePoint
	click on poygon and drag - movePolygon
	
	*/
	// How am I going to adjust the data? I'm going to change its coordinates directly no?
	applyGeometrySelection(event){
		let obj = this;
		
		// First get the canvas pixel coordinates of the event.
		let clickpoint = obj.event2canvas(event);
		
		// Find the top most geometry that has the event in it. The loop should go from the last to the first geometry,
		// Return a series of points to which the drag interaction offset should be applied.
		let g = obj.geometries.map(g=>[false]);
		for(let i=obj.geometries.length-1; i>-1; i--){
			
			let points = obj.geometries[i].map(p=>obj.unit2px(p));

			// Check if the current point is within the geometry. If it is don't check for other geometries.			
			if( isPointInside(points, clickpoint) ){
				
				// All the points at once are considered initially, and if any of hte points are close enough to the clicked point, then the selection is narrowed down to that point.
				g[i] = [true];
			} // if
			
			
			// Always want to find only the closest point, so even when finding candidates restict to the closest one.
			let candidates = points.filter(p=>distPx(clickpoint,p) < 10**2).forEach((p,j)=>{
				// g[i] now has an index saying whether the click was within the geometry or not. But what I want to know is whether a distance needs to be calculated or not. And at some point I will want to select several points at once.
				// Here I know that the point will definitely be selected instead of the whole geometry. Furthermore, I know that a single point should be selected.
				g[i][0] = true;
				
				let current = g[i][1] !=undefined ? points[ g[i][1] ] : p;
				let isCloser = distPx( clickpoint, p ) <= distPx( clickpoint, current );
				g[i][1] = isCloser ? points.indexOf(p) : g[i][1];
				
			}) // forEach
						

			// If some geometry was found on this layer, then stop the process.
			if(g[i]){
				continue;
			} // if
		} // for	
		
		obj.correctionflag = g;
		console.log(g);
		
	} // applyGeometrySelection
	
	getMoveCorrection(i,j){
		let obj = this;
		
		// First check if the geometry should be corrected, and secondly check if a point in hte geometry should be corrected. If the point is defined it should override the geometry flag.
		let isGeometry = obj.correctionflag[i][0];
		let isPoint = obj.correctionflag[i][1];
		let correctionNeeded = isPoint != undefined ? isPoint==j : isGeometry;
		
		return obj.movecorrection.map(p=>p*correctionNeeded);
		
	} // getMoveCorrection
	
	applyMoveCorrections(){
		// Apply corrections permanently.
		let obj = this;
		
		for(let i=0; i<obj.geometries.length; i++){
			obj.geometries[i].forEach((p,j)=>{
				let corr = obj.getMoveCorrection(i,j);
				p[0] += corr[0];
				p[1] += corr[1];
			})
		} // for	
		
		obj.movecorrection = [0,0];
		
	} // applyMoveCorrections
	
	onpointermove(){
		// dummy functionality
	};
	
	
	// DATA TRANSFORM PLACEHOLDERS
	event2canvas(event){
		// Get the canvas bounding box.
		let obj = this;
		let rect = obj.ctx.canvas.getBoundingClientRect();
		return [event.clientX - rect.x, event.clientY - rect.y]
	} // event2canvas
	
	px2unit(p){
		// Dummy function allowing the points added through clicking to be non-dimensionalised correctly.
		return p
	} // px2unit
	
	unit2px(p){
		return p
	} // unit2px
	
	// DRAWING
	
	draw(){
		let obj = this;
		
		for(let i=0; i<obj.geometries.length; i++){
			let current = obj.geometries[i];
			let points = current.map((p,j)=>{
				let corr = obj.getMoveCorrection(i,j);
				let pc = [p[0]+corr[0], p[1]+corr[1]];
				return obj.unit2px(pc)
			});
			
			obj.drawLines(points, current.closed);
			obj.drawPoints(points);
		} // for		
		
	} // draw
	
	
	drawClip(){
		let obj = this;
		let ctx = obj.ctx;
		// Draw the current clip
		ctx.fillStyle = '#FFFFFF';
		
		ctx.beginPath();
		
		obj.geometries.filter(geometry=>geometry.closed).forEach(closedgeometry=>{
			let points = closedgeometry.map(p=>obj.unit2px(p));
			
			ctx.moveTo( points[0][0], points[0][1] );
			for(let i=0; i<points.length;i++){
				ctx.lineTo( points[i][0], points[i][1] );
			} // for
			ctx.fill();
			
		}) // forEach
		
		ctx.clip();
	} // drawClip
	
	drawLines(points, closed){
		let ctx = this.ctx;
		
		
		// Iterate through points, and draw them.
		if(points.length > 1){
			
			ctx.fillStyle = '#000000';
			ctx.lineWidth = 2;
			
			ctx.moveTo( points[0][0], points[0][1] );
			ctx.beginPath();
			
			for(let i=0; i<points.length;i++){
				ctx.lineTo( points[i][0], points[i][1] );
			} // for
			
			
			
			
			if(closed){
				ctx.closePath();
				ctx.fill();
			} // if
			
			ctx.stroke();
		}; // if
	} // drawLines
	
	drawPoints(points){
		// Draw points on top of the lines. Point circles not used in the mask itself.
		let obj = this;
		for(let i=0; i<points.length; i++){
			obj.drawNode( points[i] );
		} // for
		
	} // drawPoints
	
	drawNode(p){
		let obj = this;
		let ctx = obj.ctx;

		// ctx.arc(x,y,r,sAngle,eAngle,counterclockwise);		
		ctx.beginPath();
		ctx.fillStyle = '#000000';
		ctx.arc( p[0],p[1],5,0*Math.PI,2*Math.PI);
		ctx.fill();
		ctx.closePath();

		// ctx.arc(x,y,r,sAngle,eAngle,counterclockwise);		
		ctx.beginPath();
		ctx.fillStyle = '#FFFFFF';
		ctx.arc( p[0],p[1],3,0*Math.PI,2*Math.PI);
		ctx.fill();
		ctx.closePath();

		
	} // drawPoint
	
	
	maskRectangle(){
		let obj = this;
		
		// Loop over geometries and find min and max in pixels.
		let x = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
		let y = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
		obj.geometries.forEach(function(geometry){
			let points = geometry.map(p=>obj.unit2px(p));
			points.forEach(function(point){
				x[0] = x[0] < point[0] ? x[0] : point[0];
				x[1] = x[1] > point[0] ? x[1] : point[0];
				
				y[0] = y[0] < point[1] ? y[0] : point[1];
				y[1] = y[1] > point[1] ? y[1] : point[1];				
			}) // forEach
		}) // forEach
		return {
			x: x[0], 
			y: y[0],
			w: x[1]-x[0],
			h: y[1]-y[0]
		}
	} // maskRectangle
	

} // MaskEditor


function distPx(p0, p1){
	// Calculate the pixel distance of 2 points.
	return (p0[0]-p1[0])**2 + (p0[1]-p1[1])**2;
} // distPx


function isPointInside(boundary, point){
	// Check wheteher the 'point' [pixel coordinates] is within the polygon defined by the points array 'boundary'.
	let obj = this;
	
	// Default answer is no.
	let isInside = false
	
	let n = boundary.length
	if(n>2){
		for(let i=1; i<n; i++){
			// Check whether this edge is being passed when moving from the point to the right. If it passes an even number of edges it's outside, otherwise it's inside.
			let p = passesEdge(boundary[i-1], boundary[i], point)
			isInside = p ? !isInside : isInside
		} // for
		
		// Need to check the same number of edge segments as vertex points. The last edge should be the last and the first point.
		let p = passesEdge(boundary[n-1], boundary[0], point)
		isInside = p ? !isInside : isInside
	} // if
	
	return isInside
} // isPointInside

// A ray casting method to check whether a point is within a polygon or not.
function passesEdge(p0, p1, point){
	// One point needs to be above, while the other needs to be below -> the above conditions must be different.
	
	if( (p0[1] > point[1]) !== (p1[1] > point[1]) ){
		// One is above, and the other below. Now find if the x are positioned so that the ray passes through. Essentially interpolate the x at the y of the point, and see if it is larger.
		let x = (p1[0] - p0[0])/(p1[1] - p0[1])*(point[1] - p0[1]) + p0[0]
		return x > point[0]
		
	} else {
		return false
	} // if
} // checkIntersect
