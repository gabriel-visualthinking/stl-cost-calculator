<script lang="ts">
	import type { ChangeEventHandler } from 'svelte/elements';
	import * as THREE from 'three';
	import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

	const eurPerGram = 0.05;
  const density = 0.00125

	let fileInput: File;
	let infill = 15;
	let walls = 2;
	let weight: number | undefined;

	// Function to parse the STL file
	const parseSTLFile = (file: File) => {
		return new Promise((resolve, reject) => {
			const loader = new STLLoader();
			loader.load(
				URL.createObjectURL(file),
				(geometry) => {
					resolve(geometry);
				},
				undefined,
				(error) => {
					reject(error);
				}
			);
		});
	};

	// Function to calculate the volume from parsed geometry data using voxelization
	const calculateVolumeFromGeometry = (geometry: THREE.InstancedBufferGeometry) => {
		let position = geometry.attributes.position;
		let sum = 0;
		let p1 = new THREE.Vector3(),
			p2 = new THREE.Vector3(),
			p3 = new THREE.Vector3();
		if (!geometry.index) {
			let faces = position.count / 3;
			for (let i = 0; i < faces; i++) {
				p1.fromBufferAttribute(position, i * 3 + 0);
				p2.fromBufferAttribute(position, i * 3 + 1);
				p3.fromBufferAttribute(position, i * 3 + 2);
				sum += signedVolumeOfTriangle(p1, p2, p3);
			}
		} else {
			let index = geometry.index;
			let faces = index.count / 3;
			for (let i = 0; i < faces; i++) {
				p1.fromBufferAttribute(position, index.array[i * 3 + 0]);
				p2.fromBufferAttribute(position, index.array[i * 3 + 1]);
				p3.fromBufferAttribute(position, index.array[i * 3 + 2]);
				sum += signedVolumeOfTriangle(p1, p2, p3);
			}
		}
		return sum;
	};

	function signedVolumeOfTriangle(p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3) {
		return p1.dot(p2.cross(p3)) / 6.0;
	}

	// Function to calculate the surface area from parsed geometry data
	const calculateSurfaceAreaFromGeometry = (geometry: THREE.InstancedBufferGeometry) => {
		const vertices = geometry.attributes.position.array;
		const indices = geometry.index ? geometry.index.array : null;
		let totalArea = 0;

		// If the geometry is indexed, iterate over each triangle
		if (indices) {
			for (let i = 0; i < indices.length; i += 3) {
				const v1Index = indices[i] * 3;
				const v2Index = indices[i + 1] * 3;
				const v3Index = indices[i + 2] * 3;

				const v1 = new THREE.Vector3(
					vertices[v1Index],
					vertices[v1Index + 1],
					vertices[v1Index + 2]
				);
				const v2 = new THREE.Vector3(
					vertices[v2Index],
					vertices[v2Index + 1],
					vertices[v2Index + 2]
				);
				const v3 = new THREE.Vector3(
					vertices[v3Index],
					vertices[v3Index + 1],
					vertices[v3Index + 2]
				);

				const edge1 = new THREE.Vector3().subVectors(v2, v1);
				const edge2 = new THREE.Vector3().subVectors(v3, v1);

				const triangleArea = edge1.cross(edge2).length() / 2;
				totalArea += triangleArea;
			}
		} else {
			// If the geometry is not indexed, assume each group of 3 vertices forms a triangle
			for (let i = 0; i < vertices.length; i += 9) {
				const v1 = new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2]);
				const v2 = new THREE.Vector3(vertices[i + 3], vertices[i + 4], vertices[i + 5]);
				const v3 = new THREE.Vector3(vertices[i + 6], vertices[i + 7], vertices[i + 8]);

				const edge1 = new THREE.Vector3().subVectors(v2, v1);
				const edge2 = new THREE.Vector3().subVectors(v3, v1);

				const triangleArea = edge1.cross(edge2).length() / 2;
				totalArea += triangleArea;
			}
		}

		return totalArea;
	};

	// Call this function when the file is uploaded
	const handleFileUpload: ChangeEventHandler<HTMLInputElement> = async (event) => {
		const target = event.target as HTMLInputElement;

		const files = target.files;
		if (!files) {
			return;
		}
		fileInput = files[0];
	};

	const calculate = async () => {
		if (fileInput) {
			try {
				const geometry = (await parseSTLFile(fileInput)) as THREE.InstancedBufferGeometry;
				const volume = calculateVolumeFromGeometry(geometry);
				const area = calculateSurfaceAreaFromGeometry(geometry);
				console.log('Wall weight:', area * (0.5 + 0.2 * (walls - 1)) * density);
				console.log('Infill weight:', volume * (infill / 100 + 0.05) * density);
				weight = (volume * (infill / 100 + 0.05) + area * (0.5 + 0.2 * (walls - 1))) * density;
			} catch (error) {
				console.error('Error parsing STL file:', error);
			}
		}
	};
</script>

<div class="w-screen h-screen flex justify-center items-center">
	<div class="p-4 bg-base-200 w-full max-w-xl rounded-2xl flex flex-col gap-4 shadow-xl">
		<div class="text-xl pl-2">Goldie's STL Printing Cost Calculator</div>
		{#if weight}
			<div class="bg-base-300 p-4 rounded-xl flex flex-col gap-2 text-lg">
				<div class="flex items-center gap-4 justify-between">
					<span>Estimated Weight:</span> <span class="font-bold">{Math.round(weight)} g</span>
				</div>
				<div class="flex items-center gap-4 justify-between">
					<span>Cost per gram:</span> <span class="font-bold">{eurPerGram} €</span>
				</div>
				<div class="flex items-center gap-4 justify-between">
					<span>Estimated Cost:</span>
					<span class="font-bold">{(Math.round(weight * eurPerGram * 100) / 100).toFixed(2)} €</span
					>
				</div>
			</div>
      <div role="alert" class="alert alert-warning">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        <span>This is merely an estimation! Usually the estimate will be above the actual price, to be cautious, but can also sometimes be below. Contact me for the final quote.</span>
      </div>
			<button on:click={() => (weight = undefined)} class="btn btn-primary">Back</button>
		{:else}
			<div class="w-full">
				<div class="pl-1 pb-1">STL file:</div>
				<input class="file-input w-full" type="file" on:change={handleFileUpload} />
			</div>
			<div class="w-full">
				<div class="pl-1 pb-1">Infill percentage:</div>
				<div class="flex">
					<input type="range" min="10" max="70" class="range range-accent" step="5" bind:value={infill} />
					<div class="text-nowrap pl-4">
						{infill} %
					</div>
				</div>
				<div class="pl-1 pt-1 text-sm text-gray-500">
					If you don't know what this means, leave it on the default 15%
				</div>
			</div>
			<div class="w-full">
				<div class="pl-1 pb-1">Wall loops:</div>
				<div class="flex">
					<input type="range" min="1" max="8" class="range range-accent" step="1" bind:value={walls} />
					<div class="text-nowrap pl-4">
						{walls}
					</div>
				</div>
				<div class="pl-1 pt-1 text-sm text-gray-500">
					If you don't know what this means, leave it on the default 2
				</div>
			</div>
      <div role="alert" class="alert alert-warning">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        <span>This is merely an estimation! Usually the estimate will be above the actual price, to be cautious, but can also sometimes be below. Contact me for the final quote.</span>
      </div>
			<button disabled={!fileInput} class="btn btn-primary" on:click={calculate}>Calculate</button>
		{/if}
	</div>
</div>
