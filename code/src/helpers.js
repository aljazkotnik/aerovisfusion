export function html2element(html){
  let template = document.createElement('template'); 
  template.innerHTML = html.trim(); // Never return a text node of whitespace as the result
  return template.content.firstChild;
} // html2element

export function svg2element(svg){
  let g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.innerHTML = svg.trim();
  return g.firstChild;
} // svg2element



export function getArrayMax(arr) {
    let len = arr.length;
    let max = -Infinity;

    while (len--) {
        max = arr[len] > max ? arr[len] : max;
    }
    return max;
}


export function getArrayMin(arr) {
    let len = arr.length;
    let min = Infinity;

    while (len--) {
        min = arr[len] < min ? arr[len] : min;
    }
    return min;
}





export function text2csv(t){
	// Read a regular table and create json objects based on the rows.
	let rows = t.split("\n"); // \r\n depending on hte csv file??
	let header = rows.splice(0, 1)[0];
	let properties = header.split(",").map(t=>t.replaceAll('"',''));
	
	// The csv has some properties such as property:0/1/2 to indicate three components. These could be merged into a single array.
	return rows.reduce((acc,r)=>{
		
		let values = r.split(",");
		
		// Check to make sure the values and properties match up.
		if(values.length == properties.length){
			let o = {};
			values.forEach((v,i)=>{
				o[properties[i]] = Number(v);
			});
			acc.push(o)
		} // if
		
		return acc;
	},[]) // map
	
} // text2csv


export function csvStreamline2jsonStreamline(c){
	// c is just a table of points. One of the parameters is `IntegrationTime', and whenever it is 0 it indicates a separate integration effort. There are positive and negative times, so I think that's how the front integration is separated from back integration. And the other file helps indicate which ones correspond to make a single line.
	
	
	// The second thing that must happen is the stitching of streamlines together.
	// ParaView streamlines were created using a seed sphere, within which points are randomly selected as start points. From the start points ParaView integrates along the velocity vector, and against the velocity to create streamlines. The along and against parts of the streamline are output as separate lines. These need to be stitched together.
	
	
	
	let ind = -1;
	let streamlines = [];
	let seeds = [];
	
	// We're banking on the fact that the first row starts with IntegrationTime=0;
	// Bank on the fact that IntegrationTime can be used to order the points?
	c.forEach(row=>{
		if(row.IntegrationTime == 0){
			// This is a new streamline segment. Check to see if the corresponding segment has already been identified. Just compare them as strings? See if that works?
			let id = `${row["Points:0"]}, ${row["Points:1"]}, ${row["Points:2"]}`;
			let seedind = seeds.indexOf(id);
			if(seedind < 0){
				// Ok, make new streamline entry, and rebase ind to it.
				streamlines.push([row]);
				ind = streamlines.length-1;
				seeds.push(id);	
			} else {
				// Entry exists - rebase ind to it. Only branch where row does not get stored - it's the same as the first point of hte current streamline.
				ind = seedind;
			} // if
		} else {
			// This was separated out so that the seed point does not get repeated in hte data.
			streamlines[ind].push(row)
		} // if
		
		
	}) // forEach
	
	// Note that the seed point is registered twice in the streamlines array.
	
	
	// Now the streamline segments should have been stitched together, so the points onlyneed to be sorted according to the IntegrationTime.
	streamlines.forEach(s=>s.sort((a,b)=>a.IntegrationTime-b.IntegrationTime));
	
	
	// Ok - next task: we have the streamlines stitched together now, but we also want to interpolate them in time so that we can control the velocity with which we move along the line. Maybe calculate the average delta? But the interpolation should be done outside sothat it can be dynamically recalculated if needed?
	// console.log(streamlines, deltas)
	
	
	// filter out any lines with less than 2 points.
	return streamlines.filter(line=>line.length>1);
	
} // csvStreamline2jsonStreamline


function deltas(A,accessor){
	// Calculate the deltas between array elements. The values can be specified using the accessor.
	accessor = accessor instanceof Function ? accessor : function(v){return v};
	
	let d = [];
	for(let i=0; i<A.length-1; i++){
		d.push( accessor(A[i+1]) - accessor(A[i]) )
	} // for
	
	return d;
	
} // diff


export function trimStringToLength(s, n){
	// n has to be > 3.
	return s.length > n ? "..." + s.slice(-(n-3)) : s;
} // trimStringToLength

