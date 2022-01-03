// import distance
// import routes
// import teams

const trips = [{
	name: '往路',
	center: routes[0][0],
	bearing: 95,
	startTime: 1641078000000
}, {
	name: '復路',
	center: routes[1][0],
	bearing: -50,
	startTime: 1641164400000
}];

const sections = [[
	{name: '<i class="far fa-flag"></i>スタート 読売新聞社前', index: 0, distance: 0, record: 20.974587002474177},
	{name: '<i class="fas fa-flag"></i>鶴見中継所', index: 84, distance: 21.359121097519537, record: 21.035128937347521},
	{name: '<i class="fas fa-flag"></i>戸塚中継所', index: 226, distance: 44.43348892351547, record: 21.591783083454362},
	{name: '<i class="fas fa-flag"></i>平塚中継所', index: 359, distance: 65.81535189365847, record: 20.744999987623745},
	{name: '<i class="fas fa-flag"></i>小田原中継所', index: 510, distance: 86.73322688117908, record: 17.712562973508204},
	{name: '<i class="fas fa-flag-checkered"></i>ゴール 芦ノ湖', index: 1012, distance: 107.52088759314357}
], [
	{name: '<i class="far fa-flag"></i>スタート 芦ノ湖', index: 0, distance: 0, record: 21.726307131090458},
	{name: '<i class="fas fa-flag"></i>小田原中継所', index: 451, distance: 20.742588224877196, record: 20.698424540803006},
	{name: '<i class="fas fa-flag"></i>平塚中継所', index: 604, distance: 42.01596900292473, record: 20.134210055242527},
	{name: '<i class="fas fa-flag"></i>戸塚中継所', index: 761, distance: 63.43093853112574, record: 20.412455085006607},
	{name: '<i class="fas fa-flag"></i>鶴見中継所', index: 916, distance: 86.57072442054573, record: 20.164279580823364},
	{name: '<i class="fas fa-flag-checkered"></i>ゴール 読売新聞社前', index: 1003, distance: 109.64762216304358}
]];

const trackingModes = [
	'auto',
	'normal',
	'front',
	'front-above',
	'back',
	'back-above',
	'drone',
	'helicopter',
	'bird'
];
const trackingParams = {
	zoom: {},
	bearing: {},
	pitch: {}
};

const charts = [];

const SQRT3 = Math.sqrt(3);

const trip = new Date(Date.now() + (new Date().getTimezoneOffset() + 540) * 60000).getDate() % 2;
const routeFeature = turf.lineString(routes[trip]);

for (const team of teams) {
	team.distance = 0;
	team.speed = 20 - Math.random() * 0.6;
	team.ts = trips[trip].startTime / 1000;
	team.speedHistory = [{d: [], s: []}, {d: [], s: []}];
	team.offset = Math.random() * 6 - 3;
}

let modelOrigin;
let modelScale;

let trackingTeam;
let trackingMode = 'front';
let autoTrackingMode = true;
let lastViewSwitch = Date.now();
let trackingAnimationID;
let chartSection;

class MapboxGLButtonControl {

	constructor(optionArray) {
		this._options = optionArray.map(options => ({
			className: options.className || '',
			title: options.title || '',
			eventHandler: options.eventHandler
		}));
	}

	onAdd(map) {
		const me = this;

		me._map = map;

		me._container = document.createElement('div');
		me._container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';

		me._buttons = me._options.map(options => {
			const button = document.createElement('button'),
				icon = document.createElement('span'),
				{className, title, eventHandler} = options;

			button.className = className;
			button.type = 'button';
			button.title = title;
			button.setAttribute('aria-label', title);
			button.onclick = eventHandler;

			icon.className = 'mapboxgl-ctrl-icon';
			icon.setAttribute('aria-hidden', true);
			button.appendChild(icon);

			me._container.appendChild(button);

			return button;
		});

		return me._container;
	}

	onRemove() {
		const me = this;

		me._container.parentNode.removeChild(me._container);
		me._map = undefined;
	}

}

class RunnerLayer {

	constructor(options) {
		const me = this;

		me.id = options.id;
		me.type = 'custom';
		me.renderingMode = '3d';
	}

	onAdd(map, gl) {
		const me = this,
			// {_fov, width, height} = map.transform,
			gltfLoader = new THREE.GLTFLoader(),
			textureLoader = new THREE.TextureLoader(),
			renderer = me.renderer = new THREE.WebGLRenderer({
				canvas: map.getCanvas(),
				context: gl
			}),
			scene = me.scene = new THREE.Scene(),
			light = me.light = new THREE.DirectionalLight(0xffffff, .8),
			ambientLight = me.ambientLight = new THREE.AmbientLight(0xffffff, .4);

		renderer.outputEncoding = THREE.sRGBEncoding;
		renderer.autoClear = false;

		scene.add(light);
		scene.add(ambientLight);

		// This is needed to avoid a black screen with empty scene
		// scene.add(new Mesh());

		gltfLoader.load('runner.glb', gltf => {
			const mesh = gltf.scene;

			mesh.position.x = 0;
			mesh.position.y = 0;
			mesh.position.z = 0;
			mesh.rotation.x = Math.PI / 2;
			mesh.rotation.y = Math.PI;
			mesh.rotation.z = 0;

			for (let i = 1; i < teams.length; i++) {
				const team = teams[i],
					object = THREE.SkeletonUtils.clone(mesh);

				const texture = textureLoader.load(`textures/${i}.png`);
				texture.encoding = THREE.sRGBEncoding;
				texture.flipY = false;
				const material = new THREE.MeshPhongMaterial({
					map: texture,
					transparent: true
				});
				object.traverse(child => {
					if (child.isMesh) {
						child.material = material;
					}
				});

				team.object = new THREE.Object3D();
				team.object.scale.x = modelScale * 5;
				team.object.scale.y = modelScale * 5;
				team.object.scale.z = modelScale * 5;
				team.object.add(object);

				team.object2 = THREE.SkeletonUtils.clone(team.object);

				scene.add(team.object);

				team.object.userData.mixer = new THREE.AnimationMixer(team.object);
				team.object.userData.mixer.clipAction(gltf.animations[2]).play();

				scene.add(team.object2);

				team.object2.userData.mixer = new THREE.AnimationMixer(team.object2);
				team.object2.userData.actions = gltf.animations.slice(2, 4).map(
					clip => team.object2.userData.mixer.clipAction(clip).play()
				);
				team.object2.userData.duration = 20 / 24;
			}


			const animate = () => {
				for (let i = 1; i < teams.length; i++) {
					const {object, object2} = teams[i],
						duration = 20 / 24,
						duration2 = object2.userData.duration;

					if (object) {
						object.userData.mixer.setTime((performance.now() / 750 + i / teams.length * duration) % duration);
					}
					if (object2) {
						object2.userData.mixer.setTime((performance.now() / 750 + i / teams.length * duration2) % duration2);
					}
				}
				requestAnimationFrame(animate);
			};

			animate();
		});

		me.map = map;
		me.camera = new THREE.Camera();

		/*map.on('resize', event => {
			const {width, height} = event.target.transform;

			me.camera.aspect = width / height;
			me.camera.updateProjectionMatrix();
		});*/
	}

	render(gl, matrix) {
		const me = this,
			m = new THREE.Matrix4().fromArray(matrix),
			l = new THREE.Matrix4()
				.makeTranslation(modelOrigin.x, modelOrigin.y, modelOrigin.z)
				.scale(new THREE.Vector3(1, -1, 1)),
			rad = THREE.MathUtils.degToRad(me.map.getBearing() + 30);

		me.camera.projectionMatrix = m.multiply(l);
		me.light.position.set(-Math.sin(rad), -Math.cos(rad), SQRT3).normalize();
		me.renderer.resetState();
		me.renderer.render(me.scene, me.camera);
		me.map.triggerRepaint();
	}

}

function clamp(value, lower, upper) {
	return Math.min(Math.max(value, lower), upper);
}

function easeOutQuart(t) {
	return -((t = t - 1) * t * t * t - 1);
}

function createInterpolant(xs, ys) {
	const length = xs.length;

	// Get consecutive differences and slopes
	const dys = [], dxs = [], ms = [];
	for (let i = 0; i < length - 1; i++) {
		const dx = xs[i + 1] - xs[i], dy = ys[i + 1] - ys[i];
		dxs.push(dx); dys.push(dy); ms.push(dy / dx);
	}

	// Get degree-1 coefficients
	const c1s = [ms[0]];
	for (let i = 0; i < dxs.length - 1; i++) {
		const m = ms[i], mNext = ms[i + 1];
		if (m * mNext <= 0) {
			c1s.push(0);
		} else {
			const dx_ = dxs[i], dxNext = dxs[i + 1], common = dx_ + dxNext;
			c1s.push(3 * common / ((common + dxNext)/m + (common + dx_) / mNext));
		}
	}
	c1s.push(ms[ms.length - 1]);

	// Get degree-2 and degree-3 coefficients
	var c2s = [], c3s = [];
	for (let i = 0; i < c1s.length - 1; i++) {
		const c1 = c1s[i], m_ = ms[i], invDx = 1/dxs[i], common_ = c1 + c1s[i + 1] - m_ - m_;
		c2s.push((m_ - c1 - common_) * invDx); c3s.push(common_ * invDx * invDx);
	}

	// Return interpolant function
	return x => {
		// The rightmost point in the dataset should give an exact result
		let i = xs.length - 1;
		if (x == xs[i]) {
			return ys[i];
		}

		// Search for the interval x is in, returning the corresponding y if x is one of the original xs
		let low = 0, mid, high = c3s.length - 1;
		while (low <= high) {
			mid = Math.floor(0.5 * (low + high));
			var xHere = xs[mid];
			if (xHere < x) {
				low = mid + 1;
			}
			else if (xHere > x) {
				high = mid - 1;
			}
			else {
				return ys[mid];
			}
		}
		i = Math.max(0, high);

		// Interpolate
		const diff = x - xs[i], diffSq = diff * diff;
		return ys[i] + c1s[i] * diff + c2s[i] * diffSq + c3s[i] * diff * diffSq;
	};
};

function updateTrackingParams() {
	const now = performance.now();

	if (trackingMode === 'bird') {
		const {zoom, bearing, pitch} = trackingParams;

		if (!zoom.time) {
			const time = zoom.time = [0, now, 0, 0],
				value = zoom.value = [0, map.getZoom(), 0, 0];
			for (const [i, j] of [[0, 1], [2, 1], [3, 2]]) {
				time[i] = time[j] + Math.sign(i - j) * (Math.random() * 10000 + 30000);
				value[i] = Math.random() * 6 + 16;
			}
			zoom.fn = createInterpolant(time, value);
		} else if (now >= zoom.time[2]) {
			zoom.time = zoom.time.slice(1).concat(zoom.time[3] + Math.random() * 10000 + 30000);
			zoom.value = zoom.value.slice(1).concat(Math.random() * 6 + 16);
			zoom.fn = createInterpolant(zoom.time, zoom.value);
		}
		if (!bearing.time) {
			const time = bearing.time = [0, now, 0, 0],
				value = bearing.value = [0, map.getBearing(), 0, 0];
			for (const [i, j] of [[0, 1], [2, 1], [3, 2]]) {
				time[i] = time[j] + Math.sign(i - j) * (Math.random() * 10000 + 40000);
				value[i] = Math.random() * 360 - 180;
			}
			bearing.fn = createInterpolant(time, value);
		} else if (now >= bearing.time[2]) {
			bearing.time = bearing.time.slice(1).concat(bearing.time[3] + Math.random() * 10000 + 40000);
			bearing.value = bearing.value.slice(1).concat(Math.random() * 360 - 180);
			bearing.fn = createInterpolant(bearing.time, bearing.value);
		}
		if (!pitch.time) {
			const time = pitch.time = [0, now, 0, 0],
				value = pitch.value = [0, map.getPitch(), 0, 0];
			for (const [i, j] of [[0, 1], [2, 1], [3, 2]]) {
				time[i] = time[j] + Math.sign(i - j) * (Math.random() * 10000 + 20000);
				value[i] = Math.random() * 30 + 45;
			}
			pitch.fn = createInterpolant(time, value);
		} else if (now >= pitch.time[2]) {
			pitch.time = pitch.time.slice(1).concat(pitch.time[3] + Math.random() * 10000 + 20000);
			pitch.value = pitch.value.slice(1).concat(Math.random() * 30 + 45);
			pitch.fn = createInterpolant(pitch.time, pitch.value);
		}
	} else {
		delete trackingParams.zoom.time;
		delete trackingParams.bearing.time;
		delete trackingParams.pitch.time;
		if (trackingMode === 'drone') {
			const bearing = map.getBearing();
			trackingParams.bearing.fn = t => (bearing - (t - now) / 200) % 360;
		} else if (trackingMode === 'helicopter') {
			const bearing = map.getBearing();
			trackingParams.bearing.fn = t => (bearing + (t - now) / 400) % 360;
		}
	}
}

function jumpTo(options) {
	const now = performance.now(),
		currentZoom = map.getZoom(),
		currentBearing = map.getBearing(),
		currentPitch = map.getPitch(),
		scrollZooming = map.scrollZoom._active;
	let zoom, pitch,
		{center, bearing, factor, bearingFactor} = options;

	if (trackingMode === 'normal') {
		zoom = currentZoom;
		bearing = currentBearing;
		pitch = currentPitch;
	} else if (trackingMode === 'drone') {
		zoom = 19;
		bearing = trackingParams.bearing.fn(now);
		pitch = 80;
	} else if (trackingMode === 'helicopter') {
		zoom = 17;
		bearing = trackingParams.bearing.fn(now);
		pitch = 60;
	} else if (trackingMode === 'bird') {
		updateTrackingParams();
		zoom = trackingParams.zoom.fn(now);
		bearing = trackingParams.bearing.fn(now);
		pitch = trackingParams.pitch.fn(now);
	} else {
		if (trackingMode === 'front' || trackingMode === 'front-above') {
			bearing = (bearing + 360) % 360 - 180;
		}
		if (trackingMode === 'front') {
			bearing += 5;
		} else if (trackingMode === 'back') {
			bearing -= 5;
		}
		if (bearingFactor >= 0) {
			bearing = currentBearing + ((bearing - currentBearing + 540) % 360 - 180) * bearingFactor;
		}
		if (trackingMode === 'front' || trackingMode === 'back') {
			zoom = 21;
			pitch = 85;
		} else {
			zoom = 17;
			pitch = 60;
		}
	}

	if (factor >= 0) {
		const {lng: fromLng, lat: fromLat} = map.getCenter(),
			[toLng, toLat] = center;

		center = new mapboxgl.LngLat(
			fromLng + (toLng - fromLng) * factor,
			fromLat + (toLat - fromLat) * factor
		);
		zoom = currentZoom + (zoom - currentZoom) * factor;
		pitch = currentPitch + (pitch - currentPitch) * factor;
	}

	map.jumpTo({center, zoom, bearing, pitch}, {auto: true});

	// Workaround for the issue of the scroll zoom during tracking
	if (scrollZooming) {
		map.scrollZoom._active = true;
	}
}

function stopTrackingAnimation() {
	if (trackingAnimationID) {
		cancelAnimationFrame(trackingAnimationID);
		trackingAnimationID = undefined;
	}
}

function startTrackingAnimation() {
	const start = performance.now();
	let t2 = 0;

	const animate = () => {
		const elapsed = Math.min(performance.now() - start, 3000),
			t1 = easeOutQuart(elapsed / 3000),
			factor = 1 - (1 - t1) / (1 - t2),
			{coord, bearing} = teams[trackingTeam];

		jumpTo({
			center: coord,
			bearing,
			factor: factor,
			bearingFactor: factor
		});
		t2 = t1;

		if (elapsed === 3000) {
			trackingAnimationID = undefined;
		} else {
			trackingAnimationID = requestAnimationFrame(animate);
		}
	};

	stopTrackingAnimation();
	updateTrackingParams();
	animate();
}

function getSection(distance) {
	for (let i = 1; i < sections[trip].length - 1; i++) {
		const section = sections[trip][i];

		if (distance < section.distance) {
			return i - 1;
		}
	}
	return sections[trip].length - 2;
}

const placing = [4, 8, 1, 9, 7, 12, 10, 2, 3, 5, 6, 15, 16, 20, 21, 14, 13, 11, 17, 19, 18];

function updatePlacing() {
	placing
		.sort((a, b) => teams[b].distance - teams[a].distance)
		.forEach((v, i) => {
			const team = teams[v],
				element = document.getElementById(`team-${i + 1}`);

			team.marker.getElement().style.zIndex = 21 - i;
			element.innerText = `${i + 1}. ${team.name}`;
		});
}

function updateChart() {
	if (isNaN(trackingTeam)) {
		return;
	}

	const team = teams[trackingTeam],
		distance = team.estimatedDistance,
		section = chartSection = team.estimatedSection,
		baseDistance = sections[trip][section].distance,
		nextDistance = sections[trip][section + 1].distance,
		annotations = charts[swiper.activeIndex].config.options.plugins.annotation.annotations;

	if (swiper.activeIndex === 0) {
		for (let i = 1; i < teams.length; i++) {
			const dataset = charts[0].config.data.datasets[i - 1],
				data = dataset.data = [];
			for (let j = 0; j < teams[i].speedHistory[trip].d.length; j++) {
				const d = teams[i].speedHistory[trip].d[j];
				if (d >= baseDistance && d <= nextDistance) {
					data.push({x: d - baseDistance, y: teams[i].speedHistory[trip].s[j]});
				}
			}
			dataset.borderColor = i === trackingTeam ? 'rgb(0, 255, 0)' : 'rgba(0, 102, 0)';
			dataset.borderWidth = i === trackingTeam ? 3 : 1;
			dataset.label = `${teams[i].shortName}・${teams[i].runners[trip * 5 + section].match(/[^・ ]+ /)[0]}`;
			dataset.order = i === trackingTeam ? 0 : 1;
		}
		charts[0].config.options.plugins.title.text = `${trip * 5 + section + 1}区 ランナー速度`;
		annotations.record.yMin = annotations.record.yMax = sections[trip][section].record;
	} else {
		const data = distances[trip].slice(sections[trip][section].index, sections[trip][section + 1].index + 1);
		charts[1].config.data.datasets[0].data = data.map(([d, e]) => ({x: d - baseDistance, y: e}));
		charts[1].config.options.plugins.title.text = `${trip * 5 + section + 1}区 コース標高`;
	}

	charts[swiper.activeIndex].config.options.scales.x.max = nextDistance - baseDistance;
	annotations.position.xMin = annotations.position.xMax = distance - baseDistance;
	charts[swiper.activeIndex].update();
}

function setInteractions(enable) {
	for (const handler of ['scrollZoom', 'boxZoom', 'dragRotate', 'dragPan', 'keyboard', 'doubleClickZoom', 'touchZoomRotate']) {
		if (enable) {
			map[handler].enable();
		} else {
			map[handler].disable();
		}
	}
}

function updateModelOrigin(lngLat) {
	const elevation = map.queryTerrainElevation(lngLat);

	modelOrigin = mapboxgl.MercatorCoordinate.fromLngLat(lngLat, elevation);
	modelScale = modelOrigin.meterInMercatorCoordinateUnits();
}

const panelElement = document.getElementById('panel');

function showPanel() {
	panelElement.style.bottom = 0;
}

function hidePanel() {
	panelElement.style.bottom = 'min(-25%, -150px)';
}

const trackingStatusElement = document.getElementById('tracking-status');
const trackingInfoElement = document.getElementById('tracking-info');

function showTrackingInfo() {
	trackingStatusElement.style.display = 'inline';
	trackingInfoElement.style.display = 'table';
}

function hideTrackingInfo() {
	trackingStatusElement.style.display = 'none';
	trackingInfoElement.style.display = 'none';
}

const trackingMarkerElement = document.getElementById('tracking-marker');
const trackingTeamTextElement = document.getElementById('tracking-team');
const trackingRunnerTextElement = document.getElementById('tracking-runner');

const teamsBGElement = document.getElementById('teams-bg');
const viewsBGElement = document.getElementById('views-bg');
const infoBGElement = document.getElementById('info-bg');

Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.2)';
Chart.defaults.color = '#fff';

const mapbox = location.search.match(/mapbox/);
const styleFile = mapbox ? 'style-mapbox.json' : 'style.json';
const buildingLayerId = mapbox ? 'building-3d' : 'buildings4302';
const autoPaging = location.search.match(/auto/);

mapboxgl.accessToken = 'pk.eyJ1IjoibmFnaXgiLCJhIjoiY2tqZXZ1MjQ0MGE3MDJ6bzc2cmNyaWlrOSJ9.QjrikO3RTE20AMURILSTWg';
const map = new mapboxgl.Map({
	container: 'map',
	style: styleFile,
	center: trips[trip].center,
	zoom: 21,
	bearing: trips[trip].bearing,
	pitch: 80
});

// Workaround to update pitch using constraints
const {get: getPitch, set: setPitch} = Object.getOwnPropertyDescriptor(map.transform.constructor.prototype, 'pitch');
Object.defineProperty(map.transform, 'pitch', {
	get: getPitch,
	set: function(pitch) {
		setPitch.call(this, pitch);
		this._constrain();
		this._calcMatrices();
	}
});

const canvasElement = document.querySelector('#map .mapboxgl-canvas');
const tripTextElement = document.getElementById('trip');
const sectionTextElement = document.getElementById('section');
const distanceTextElement = document.getElementById('distance');
const distanceBarElement = document.getElementById('progress');

map.addControl(new mapboxgl.NavigationControl({visualizePitch: true}));
map.addControl(new mapboxgl.FullscreenControl());
map.addControl(new MapboxGLButtonControl([{
	className: 'mapboxgl-ctrl-placing',
	title: 'チーム順位・追跡',
	eventHandler() {
		teamsBGElement.style.display = 'block';
	}
}, {
	className: 'mapboxgl-ctrl-camera',
	title: 'カメラ切り替え',
	eventHandler() {
		viewsBGElement.style.display = 'block';
	}
}, {
	className: 'mapboxgl-ctrl-info',
	title: '箱根駅伝 3D について',
	eventHandler() {
		infoBGElement.style.display = 'block';
	}
}]));

teamsBGElement.addEventListener('click', () => {
	teamsBGElement.style.display = 'none';
	canvasElement.focus();
});

for (let i = 1; i < teams.length; i++) {
	const element = document.getElementById(`team-${i}`);

	element.addEventListener('click', () => {
		trackingTeam = placing[i - 1];
		if (autoTrackingMode) {
			lastViewSwitch = Date.now();
		}
		startTrackingAnimation();
		showPanel();
		updateChart();
		canvasElement.focus();
	});
}

viewsBGElement.addEventListener('click', () => {
	viewsBGElement.style.display = 'none';
	canvasElement.focus();
});

for (const mode of trackingModes) {
	const element = document.getElementById(`${mode}-view`);

	element.addEventListener('click', () => {
		document.querySelector('.menu div.active').classList.remove('active');
		element.classList.add('active');

		if (mode === 'auto') {
			autoTrackingMode = true;
		} else {
			trackingMode = mode;
			autoTrackingMode = false;
		}
		if (trackingTeam) {
			if (autoTrackingMode) {
				trackingMode = trackingModes[Math.floor(Math.random() * (trackingModes.length - 2)) + 2];
				lastViewSwitch = Date.now();
			}
			startTrackingAnimation();
		}
		canvasElement.focus();
	});
}

infoBGElement.addEventListener('click', () => {
	infoBGElement.style.display = 'none';
	canvasElement.focus();
});

const swiper = new Swiper('.swiper', {
	navigation: {
		nextEl: '.swiper-button-next',
		prevEl: '.swiper-button-prev'
	}
});
swiper.on('slideChange', updateChart);

charts[0] = new Chart('chart-speed', {
	type: 'line',
	data: {
		datasets: teams.slice(1).map(team => ({
			label: '',
			data: [],
			borderColor: 'rgb(0, 127, 0)',
			backgroundColor: 'rgb(0, 0, 0)',
			borderWidth: 1,
			borderCapStyle: 'round',
			borderJoinStyle: 'round',
			pointRadius: 0
		}))
	},
	options: {
		maintainAspectRatio: false,
		layout: {
			padding: {
				left: 40,
				top: 5,
				right: 50,
				bottom: 10
			}
		},
		scales: {
			x: {
				type: 'linear',
				min: 0,
				grid: {
					tickLength: 0
				}
			},
			y: {
				grid: {
					tickLength: 0
				}
			}
		},
		interaction: {
			mode: 'nearest',
			intersect: false
		},
		animation: false,
		plugins: {
			title: {
				text: '',
				display: true
			},
			legend: {
				display: false
			},
			tooltip: {
				callbacks: {
					title: context => `距離 ${context[0].parsed.x.toFixed(2)} km`,
					label: context => `${context.dataset.label} ${context.parsed.y} km/s`
				}
			},
			annotation: {
				annotations: {
					position: {
						type: 'line',
						borderColor: 'rgb(255, 0, 0)',
						xMin: 0,
						xMax: 0
					},
					record: {
						type: 'line',
						borderColor: 'rgb(255, 153, 0)',
						yMin: 0,
						yMax: 0,
						label: {
							content: '区間新',
							enabled: true,
							color: 'rgb(0, 0, 0)',
							backgroundColor: 'rgba(255, 153, 0)',
							position: '80%'
						},
						drawTime: 'beforeDatasetsDraw'
					}
				}
			}
		}
	}
});

charts[1] = new Chart('chart-elevation', {
	type: 'line',
	data: {
		datasets: [{
			data: [],
			fill: 'origin',
			backgroundColor: 'rgba(0, 102, 255, 0.3)',
			borderColor: 'rgba(51, 153, 255)',
			borderCapStyle: 'round',
			borderJoinStyle: 'round',
			pointRadius: 0
		}]
	},
	options: {
		maintainAspectRatio: false,
		layout: {
			padding: {
				left: 40,
				top: 5,
				right: 50,
				bottom: 10
			}
		},
		scales: {
			x: {
				type: 'linear',
				min: 0,
				grid: {
					tickLength: 0
				}
			},
			y: {
				min: 0,
				grid: {
					tickLength: 0
				}
			}
		},
		interaction: {
			mode: 'nearest',
			intersect: false
		},
		animation: false,
		plugins: {
			title: {
				text: '',
				display: true
			},
			legend: {
				display: false
			},
			tooltip: {
				callbacks: {
					title: context => `距離 ${context[0].parsed.x.toFixed(2)} km`,
					label: context => `標高 ${context.parsed.y} m`
				}
			},
			annotation: {
				annotations: {
					position: {
						type: 'line',
						borderColor: 'rgb(255, 0, 0)',
						xMin: 0,
						xMax: 0
					}
				}
			}
		}
	}
});

map.once('styledata', () => {
	map.addSource('route', {
		type: 'geojson',
		data: {
			type: 'Feature',
			properties: {},
			geometry: {
				type: 'LineString',
				coordinates: routes[trip]
			}
		}
	});

	map.addLayer({
		id: 'route',
		type: 'line',
		source: 'route',
		layout: {
			'line-join': 'round',
			'line-cap': 'round'
		},
		paint: {
			'line-color': 'rgba(255, 255, 0, 0.5)',
			'line-width': 4
		}
	});

	updateModelOrigin(map.getCenter());

	map.addLayer(new RunnerLayer({id: 'runners'}), buildingLayerId);

	for (const section of sections[trip]) {
		const {name, index, distance} = section,
			point1 = turf.along(routeFeature, distance),
			point2 = turf.along(routeFeature, distance + 0.001),
			bearing = turf.bearing(point2, point1) - 10,
			coord = turf.getCoord(point1);
			section.popup = new AnimatedPopup({closeButton: false, closeOnClick: false, anchor: 'bottom'})
				.setLngLat(coord)
				.setHTML(name)
				.addTo(map),
			element = section.popup.getElement();

		element.addEventListener('click', event => {
			trackingTeam = undefined;
			stopTrackingAnimation();
			hidePanel();
			setInteractions(false);
			map.flyTo({
				center: turf.getCoord(coord),
				zoom: 21,
				bearing,
				pitch: 80,
				easing: t => t,
				speed: 0.5
			}, {
				auto: true
			});
			map.once('moveend', () => {
				setInteractions(true);
				canvasElement.focus();
			});
		});
	}

	for (let i = teams.length - 1; i > 0; i--) {
		const team = teams[i],
			popup = new AnimatedPopup({anchor: 'top', closeButton: false}),
			element = document.createElement('div');

		element.className = 'marker';
		element.style.backgroundImage = `url('markers/${i}.png')`;

		element.addEventListener('mouseenter', event => {
			if (!popup.isOpen()) {
				team.marker.getPopup().setHTML(`${team.name}<br>${team.runners[trip * 5 + team.estimatedSection]}`);
				team.marker.togglePopup();
			}
		});

		element.addEventListener('mouseleave', event => {
			if (popup.isOpen()) {
				team.marker.togglePopup();
			}
		});

		element.addEventListener('click', event => {
			trackingTeam = i;
			if (autoTrackingMode) {
				lastViewSwitch = Date.now();
			}
			startTrackingAnimation();
			showPanel();
			updateChart();

			canvasElement.focus();
			event.stopPropagation();
		});

		team.marker = new mapboxgl.Marker({element})
			.setLngLat([0, 0])
			.setPopup(popup)
			.addTo(map);
	}

	map.on('click', event => {
		trackingTeam = undefined;
		stopTrackingAnimation();
		hidePanel();
	});

	const updateScales = () => {
		const scaleValue = modelScale * 5 * Math.pow(2, 20 - Math.min(map.getZoom(), 20));

		for (let i = 1; i < teams.length; i++) {
			const {object, object2} = teams[i];

			if (object) {
				const {scale} = object;

				scale.x = scale.y = scale.z = scaleValue;
			}
			if (object2) {
				const {scale} = object2;

				scale.x = scale.y = scale.z = scaleValue;
			}
		}
	};

	map.on('zoom', updateScales);
	map.on('move', updateScales);
	map.on('resize', updateScales);

	const switchToNormalTrackingMode = event => {
		if (trackingTeam !== undefined && !event.auto) {
			document.querySelector('.menu div.active').classList.remove('active');
			document.getElementById('normal-view').classList.add('active');

			trackingMode = 'normal';
			autoTrackingMode = false;
		}
	};

	map.on('zoomstart', switchToNormalTrackingMode)
	map.on('rotatestart', switchToNormalTrackingMode)
	map.on('pitchstart', switchToNormalTrackingMode)

	map.on('pitch', () => {
		const pitchFactor = Math.sin(THREE.MathUtils.degToRad(map.getPitch())),
			zoomFactor = Math.pow(2, Math.max(map.getZoom(), 20) - 20),
			offset = [0, -75 * pitchFactor * zoomFactor];

		for (const {popup} of sections[trip]) {
			if (popup) {
				popup.setOffset(offset);
			}
		}
	})

	let lastDataLoad = 0;
	let initialDataLoadComplete = false;

	const frame = () => {
		const now = Date.now(),
			transform = map.transform;

		if (now >= lastDataLoad + 10000) {
			const reset = now >= lastDataLoad + 20000;

			fetch('https://mini-tokyo.appspot.com/hakone')
				.then(response => response.json())
				.then(result => {
					for (const point of result.points) {
						const now = Date.now();
						const id = point[0];
						const lat = point[1];
						const lng = point[2];
						let distance = point[5];
						let speed = point[6];
						const position = point[7];
						const section = point[8];
						let ts = point[9];
						const prevDistance = teams[id].distance;
						const prevSpeed = teams[id].speed;
						const prevTs = teams[id].ts;

						const history = teams[id].speedHistory[trip];
						if (result.status.sg === 0 && position !== null && (history.d.length === 0 || distance > history.d[history.d.length - 1])) {
							history.d.push(distance);
							history.s.push(speed);
						}

						if (!isNaN(prevDistance) && !isNaN(prevSpeed) && !isNaN(prevTs) && !reset) {
							const adjustedDistance = prevDistance + prevSpeed * (now - prevTs * 1000) / 3600000;
							const adjustedSpeed = (distance + speed * (now + 10000 - ts * 1000) / 3600000 - adjustedDistance) * 360;

							distance = adjustedDistance;
							speed = adjustedSpeed;
							ts = now / 1000;
						}

						if (result.status.sg === 1 || position === null) {
							distance = speed = 0;
						}

						if (now >= trips[trip].startTime + 60000 || trip === 1) {
							Object.assign(teams[id], {
								lat,
								lng,
								distance,
								speed,
								section,
								ts
							});
						}
					}
					if (!initialDataLoadComplete) {
						if (teams[placing[0]].distance === 0) {
							trackingTeam = placing[0];
							showPanel();
						} else {
							setTimeout(() => {
								setInteractions(false);
								map.flyTo({
									center: turf.getCoord(turf.along(routeFeature, teams[placing[0]].estimatedDistance + 0.1)),
									zoom: 17,
									bearing: (teams[placing[0]].bearing + 360) % 360 - 180,
									pitch: 60,
									easing: t => t,
									speed: 0.5
								}, {
									auto: true
								});
								map.once('moveend', () => {
									trackingTeam = placing[0];
									trackingMode = 'front';
									lastViewSwitch = Date.now();
									startTrackingAnimation();
									showPanel();
									setInteractions(true);
								});
							}, 3000);
						}
						initialDataLoadComplete = true;
					}
					updateChart();
					updatePlacing();
					if (autoPaging && trackingTeam !== undefined && trackingTeam !== placing[0]) {
						trackingTeam = placing[0];
						if (!autoTrackingMode) {
							startTrackingAnimation();
						}
					}
				});

			if (reset) {
				fetch(`https://mini-tokyo.appspot.com/hakone?q=speed-${trip}`)
					.then(response => response.json())
					.then(result => {
						for (let i = 1; i < result.length; i++) {
							teams[i].speedHistory[trip] = result[i];
						}
						updateChart();
					})
			}

			lastDataLoad = now;
		}

		updateModelOrigin(map.getCenter());

		for (let i = 1; i < teams.length; i++) {
			const team = teams[i];
			if (!isNaN(team.distance) && !isNaN(team.speed) && !isNaN(team.ts)) {
				const distance = team.estimatedDistance = clamp(team.distance + team.speed * (now - team.ts * 1000) / 3600000, 0, sections[trip][5].distance + 0.02),
					point = turf.along(routeFeature, distance),
					point2 = turf.along(routeFeature, distance + 0.001),
					bearing = team.bearing = turf.bearing(point, point2),
					point3 = turf.destination(point, team.offset / 1000, bearing + 90),
					coord = team.coord = turf.getCoord(point3),
					section = team.estimatedSection = getSection(distance);

				const p1 = map.project(coord);
					p2 = transform._coordinatePoint(transform.locationCoordinate(mapboxgl.LngLat.convert(coord), Math.pow(2, 20 - Math.min(map.getZoom(), 20)) * 4), true);
				team.marker.setLngLat(coord).setOffset([p2.x - p1.x, p2.y - p1.y - 35]);

				if (team.object) {
					const elevation = map.queryTerrainElevation(coord),
						mCoord = mapboxgl.MercatorCoordinate.fromLngLat(coord, elevation);

					team.object.position.x = mCoord.x - modelOrigin.x;
					team.object.position.y = -(mCoord.y - modelOrigin.y);
					team.object.position.z = mCoord.z - modelOrigin.z;
					team.object.rotation.z = THREE.MathUtils.degToRad(-bearing);

					if (distance === sections[trip][5].distance + 0.02) {
						team.object.removeFromParent();
						delete team.object;
					}
				}
				if (team.object2) {
					const baseDistance = sections[trip][section].distance,
						nextDistance = sections[trip][section + 1].distance;

					if (section < 4 && nextDistance - distance <= 0.1) {
						const point4 = turf.along(routeFeature, nextDistance),
							point5 = turf.along(routeFeature, nextDistance - 0.001),
							bearing2 = turf.bearing(point4, point5),
							point6 = turf.destination(point4, team.offset / 1000, bearing2 - 90),
							coord2 = turf.getCoord(point6),
							elevation = map.queryTerrainElevation(coord2),
							mCoord = mapboxgl.MercatorCoordinate.fromLngLat(coord2, elevation);

						team.object2.position.x = mCoord.x - modelOrigin.x;
						team.object2.position.y = -(mCoord.y - modelOrigin.y);
						team.object2.position.z = mCoord.z - modelOrigin.z;
						team.object2.rotation.z = THREE.MathUtils.degToRad(-bearing2);
						team.object2.userData.actions[0].weight = 0;
						team.object2.userData.actions[1].weight = 1;
						team.object2.userData.duration = 40 / 24;
						team.object2.visible = true;
					} else if (section > 0 && distance - baseDistance <= 0.02) {
						const point4 = turf.along(routeFeature, baseDistance),
							point5 = turf.along(routeFeature, baseDistance + 0.001),
							bearing2 = turf.bearing(point4, point5),
							point6 = turf.destination(point4, team.offset / 1000, bearing2 + 90),
							point7 = turf.destination(point6, distance - baseDistance, bearing2 - 45),
							coord2 = turf.getCoord(point7),
							elevation = map.queryTerrainElevation(coord2),
							mCoord = mapboxgl.MercatorCoordinate.fromLngLat(coord2, elevation);

						team.object2.position.x = mCoord.x - modelOrigin.x;
						team.object2.position.y = -(mCoord.y - modelOrigin.y);
						team.object2.position.z = mCoord.z - modelOrigin.z;
						team.object2.rotation.z = THREE.MathUtils.degToRad(-(bearing2 - 45));
						team.object2.userData.actions[0].weight = 1;
						team.object2.userData.actions[1].weight = 0;
						team.object2.userData.duration = 20 / 24;
						team.object2.visible = true;
					} else {
						team.object2.visible = false;
					}
				}

				if (!trackingAnimationID && trackingTeam === i && !map._zooming && !map._rotating && !map._pitching) {
					jumpTo({
						center: coord,
						bearing,
						bearingFactor: .02
					});
				}

				if (i === trackingTeam || (i === placing[0] && trackingTeam === undefined)) {
					const baseDistance = sections[trip][section].distance,
						nextDistance = sections[trip][section + 1].distance;

					tripTextElement.innerText = trips[trip].name;
					sectionTextElement.innerText = trip * 5 + section + 1;
					distanceTextElement.innerText = (distance - baseDistance).toFixed(2);
					distanceBarElement.style.width = `${(distance - baseDistance) / (nextDistance - baseDistance) * 100}%`;

					if (i === trackingTeam) {
						showTrackingInfo();
						trackingMarkerElement.style.backgroundImage = `url('markers/${i}.png')`;
						trackingTeamTextElement.innerText = teams[i].name;
						trackingRunnerTextElement.innerText = teams[i].runners[trip * 5 + section];

						if (chartSection !== section) {
							updateChart();
						}
					} else {
						hideTrackingInfo();
					}
				}
			}
		}

		if (trackingTeam && now >= lastViewSwitch + 30000) {
			if (autoPaging) {
				swiper.slideTo((swiper.activeIndex + 1) % 2);
			}

			if (autoTrackingMode) {
				if (now > trips[trip].startTime - 33000 && now <= trips[trip].startTime) {
					trackingMode = 'front';
				} else {
					trackingMode = trackingModes[Math.floor(Math.random() * (trackingModes.length - 2)) + 2];
				}
				startTrackingAnimation();
			}

			lastViewSwitch = now;
		}

		requestAnimationFrame(frame);
	};

	frame();
});
