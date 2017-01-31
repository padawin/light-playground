(function() {
	let canvas = document.getElementById("my-canvas");
	let context = canvas.getContext("2d");
	let timePreviousFrame,
		maxFPS = 60,
		interval = 1000 / maxFPS;

	let nodes = [
		// polygon 1
		[10, 10],
		[70, 10],
		[70, 100],
		[10, 100],

		// polygon 2
		[130, 30],
		[140, 40],
		[120, 110],
		[120, 80],
		[90, 60],
		// border
		[0, 0],
		[canvas.width, 0],
		[canvas.width, canvas.height],
		[0, canvas.height]

	];

	let polygons = [
		[nodes[0], nodes[1]],
		[nodes[1], nodes[2]],
		[nodes[2], nodes[3]],
		[nodes[3], nodes[0]],

		[nodes[4], nodes[5]],
		[nodes[5], nodes[6]],
		[nodes[6], nodes[7]],
		[nodes[7], nodes[8]],
		[nodes[8], nodes[4]],

		[nodes[9], nodes[10]],
		[nodes[10], nodes[11]],
		[nodes[11], nodes[12]],
		[nodes[12], nodes[9]]
	];

	let lights = [
		[150, 150]
	];

	function drawLight(light) {
		context.beginPath();
		context.arc(light[0], light[1], 5, 0, 2 * Math.PI, false);
		context.fill();
	}

	function getRaySegmentIntersection(ray, segment) {
		let rayX, rayY, segmentX, segmentY;
		rayX = ray[1][0] - ray[0][0];
		rayY = ray[1][1] - ray[0][1];
		segmentX = segment[1][0] - segment[0][0];
		segmentY = segment[1][1] - segment[0][1];

		// parallel, ignore
		if (rayY / rayX == segmentY / segmentX) {
			return null;
		}

		let s, t;
		s = (-rayY * (ray[0][0] - segment[0][0]) + rayX * (ray[0][1] - segment[0][1])) / (-segmentX * rayY + rayX * segmentY);
		t = ( segmentX * (ray[0][1] - segment[0][1]) - segmentY * (ray[0][0] - segment[0][0])) / (-segmentX * rayY + rayX * segmentY);

		if (s >= 0 && s <= 1 && t >= 0) {
			return {
				param: t,
				point: [
					ray[0][0] + (t * rayX),
					ray[0][1] + (t * rayY)
				]
			};
		}
		else {
			return null;
		}
	}

	function generateShadows() {
		let shadowEdge = [];
		for (let node of nodes) {
			let lightRay = [lights[0], node];
			let closestSegment = null;
			let exactIntersections = [];
			let intersections = [];
			// find which is the closest segment the ray is touching
			for (let segment of polygons) {
				let intersectionPoint = getRaySegmentIntersection(
					lightRay,
					segment
				);

				if (!intersectionPoint) {
					continue;
				}

				// intersecting exactly at the end of the segment (the
				// intersection is the current node)
				if (intersectionPoint.param == 1) {
					exactIntersections.push(intersectionPoint);
				}
				// intersection at the middle of the segment
				else {
					intersections.push(intersectionPoint);
				}

				if (!closestSegment || closestSegment.param > intersectionPoint.param) {
					closestSegment = intersectionPoint;
				}
			}

			// the ray is passing by a polygon corner and has a single
			// other intersection (eg one of the screen borders)
			// add both intersections to make the ray reach the screen
			// edge
			if (exactIntersections.length == 2 && intersections.length == 1) {
				shadowEdge.push(intersections[0].point);
				shadowEdge.push(exactIntersections[0].point);
			}
			else {
				shadowEdge.push(closestSegment.point);
			}
		}

		shadowEdge.sort(function (a, b) {
			let angle1, angle2;
			angle1 = Math.atan2(
				a[1] - lights[0][1],
				a[0] - lights[0][0]
			);
			angle2 = Math.atan2(
				b[1] - lights[0][1],
				b[0] - lights[0][0]
			);
			return angle1 - angle2;
		});

		return shadowEdge;
	}

	function drawPolygons(polygons) {
		context.strokeStyle = 'black';
		context.beginPath();
		for (let polygon of polygons) {
			context.moveTo(polygon[0][0], polygon[0][1]);
			context.lineTo(polygon[1][0], polygon[1][1]);
		}
		context.stroke();

		context.strokeStyle = 'green';
		context.fillStyle = 'yellow';
		for (let light of lights) {
			drawLight(light);
		}
	}

	function drawShadow(shadowEdge) {
		context.beginPath();
		for (let node of shadowEdge) {
			context.moveTo(lights[0][0], lights[0][1]);
			context.lineTo(node[0], node[1]);
			context.arc(node[0], node[1], 2, 0, 2 * Math.PI, false);
		}
		context.stroke();
	}

	function mainLoop () {
		requestAnimationFrame(mainLoop);
		var now = Date.now(),
			delta = now - timePreviousFrame;

		// cap the refresh to a defined FPS
		if (delta > interval) {
			timePreviousFrame = now - (delta % interval);

			let shadowEdge = generateShadows();


			context.clearRect(0, 0, canvas.width, canvas.height);
			drawPolygons(polygons);
			drawShadow(shadowEdge);
		}
	}

	document.addEventListener('mousemove', function (e) {
		let rect = canvas.getBoundingClientRect();
		let x = e.clientX - rect.left;
		let y = e.clientY - rect.top;

		lights[0][0] = x;
		lights[0][1] = y;
	});

	timePreviousFrame = Date.now();
	mainLoop();
})();
