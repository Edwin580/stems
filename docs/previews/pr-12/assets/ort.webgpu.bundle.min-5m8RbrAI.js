/*!
 * ONNX Runtime Web v1.20.1
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */var fa=Object.defineProperty,Sf=Object.getOwnPropertyDescriptor,kf=Object.getOwnPropertyNames,Ef=Object.prototype.hasOwnProperty,Cf=(e=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(t,r)=>(typeof require<"u"?require:t)[r]}):e)(function(e){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')}),D=(e,t)=>()=>(e&&(t=e(e=0)),t),er=(e,t)=>{for(var r in t)fa(e,r,{get:t[r],enumerable:!0})},Tf=(e,t,r,i)=>{if(t&&typeof t=="object"||typeof t=="function")for(let a of kf(t))!Ef.call(e,a)&&a!==r&&fa(e,a,{get:()=>t[a],enumerable:!(i=Sf(t,a))||i.enumerable});return e},Ir=e=>Tf(fa({},"__esModule",{value:!0}),e),Nt,lt,Rt,ls,ma,ga=D(()=>{Nt=new Map,lt=[],Rt=(e,t,r)=>{if(t&&typeof t.init=="function"&&typeof t.createInferenceSessionHandler=="function"){let i=Nt.get(e);if(i===void 0)Nt.set(e,{backend:t,priority:r});else{if(i.priority>r)return;if(i.priority===r&&i.backend!==t)throw new Error(`cannot register backend "${e}" using priority ${r}`)}if(r>=0){let a=lt.indexOf(e);a!==-1&&lt.splice(a,1);for(let s=0;s<lt.length;s++)if(Nt.get(lt[s]).priority<=r){lt.splice(s,0,e);return}lt.push(e)}return}throw new TypeError("not a valid backend")},ls=async e=>{let t=Nt.get(e);if(!t)return"backend not found.";if(t.initialized)return t.backend;if(t.aborted)return t.error;{let r=!!t.initPromise;try{return r||(t.initPromise=t.backend.init(e)),await t.initPromise,t.initialized=!0,t.backend}catch(i){return r||(t.error=`${i}`,t.aborted=!0),t.error}finally{delete t.initPromise}}},ma=async e=>{let t=e.executionProviders||[],r=t.map(d=>typeof d=="string"?d:d.name),i=r.length===0?lt:r,a,s=[],n=new Set;for(let d of i){let p=await ls(d);typeof p=="string"?s.push({name:d,err:p}):(a||(a=p),a===p&&n.add(d))}if(!a)throw new Error(`no available backend found. ERR: ${s.map(d=>`[${d.name}] ${d.err}`).join(", ")}`);for(let{name:d,err:p}of s)r.includes(d)&&console.warn(`removing requested execution provider "${d}" from session options because it is not available: ${p}`);let l=t.filter(d=>n.has(typeof d=="string"?d:d.name));return[a,new Proxy(e,{get:(d,p)=>p==="executionProviders"?l:Reflect.get(d,p)})]}}),If=D(()=>{ga()}),Al,zf=D(()=>{Al="1.20.1"}),di,qe,Ol=D(()=>{zf(),di="warning",qe={wasm:{},webgl:{},webgpu:{},versions:{common:Al},set logLevel(e){if(e!==void 0){if(typeof e!="string"||["verbose","info","warning","error","fatal"].indexOf(e)===-1)throw new Error(`Unsupported logging level: ${e}`);di=e}},get logLevel(){return di}},Object.defineProperty(qe,"logLevel",{enumerable:!0})}),me,Af=D(()=>{Ol(),me=qe}),Rl,Bl,Of=D(()=>{Rl=(e,t)=>{let r=typeof document<"u"?document.createElement("canvas"):new OffscreenCanvas(1,1);r.width=e.dims[3],r.height=e.dims[2];let i=r.getContext("2d");if(i!=null){let a,s;(t==null?void 0:t.tensorLayout)!==void 0&&t.tensorLayout==="NHWC"?(a=e.dims[2],s=e.dims[3]):(a=e.dims[3],s=e.dims[2]);let n=(t==null?void 0:t.format)!==void 0?t.format:"RGB",l=t==null?void 0:t.norm,d,p;l===void 0||l.mean===void 0?d=[255,255,255,255]:typeof l.mean=="number"?d=[l.mean,l.mean,l.mean,l.mean]:(d=[l.mean[0],l.mean[1],l.mean[2],0],l.mean[3]!==void 0&&(d[3]=l.mean[3])),l===void 0||l.bias===void 0?p=[0,0,0,0]:typeof l.bias=="number"?p=[l.bias,l.bias,l.bias,l.bias]:(p=[l.bias[0],l.bias[1],l.bias[2],0],l.bias[3]!==void 0&&(p[3]=l.bias[3]));let f=s*a,c=0,u=f,y=f*2,w=-1;n==="RGBA"?(c=0,u=f,y=f*2,w=f*3):n==="RGB"?(c=0,u=f,y=f*2):n==="RBG"&&(c=0,y=f,u=f*2);for(let $=0;$<s;$++)for(let b=0;b<a;b++){let x=(e.data[c++]-p[0])*d[0],v=(e.data[u++]-p[1])*d[1],k=(e.data[y++]-p[2])*d[2],S=w===-1?255:(e.data[w++]-p[3])*d[3];i.fillStyle="rgba("+x+","+v+","+k+","+S+")",i.fillRect(b,$,1,1)}if("toDataURL"in r)return r.toDataURL();throw new Error("toDataURL is not supported")}else throw new Error("Can not access image data")},Bl=(e,t)=>{let r=typeof document<"u"?document.createElement("canvas").getContext("2d"):new OffscreenCanvas(1,1).getContext("2d"),i;if(r!=null){let a,s,n;(t==null?void 0:t.tensorLayout)!==void 0&&t.tensorLayout==="NHWC"?(a=e.dims[2],s=e.dims[1],n=e.dims[3]):(a=e.dims[3],s=e.dims[2],n=e.dims[1]);let l=t!==void 0&&t.format!==void 0?t.format:"RGB",d=t==null?void 0:t.norm,p,f;d===void 0||d.mean===void 0?p=[255,255,255,255]:typeof d.mean=="number"?p=[d.mean,d.mean,d.mean,d.mean]:(p=[d.mean[0],d.mean[1],d.mean[2],255],d.mean[3]!==void 0&&(p[3]=d.mean[3])),d===void 0||d.bias===void 0?f=[0,0,0,0]:typeof d.bias=="number"?f=[d.bias,d.bias,d.bias,d.bias]:(f=[d.bias[0],d.bias[1],d.bias[2],0],d.bias[3]!==void 0&&(f[3]=d.bias[3]));let c=s*a;if(t!==void 0&&(t.format!==void 0&&n===4&&t.format!=="RGBA"||n===3&&t.format!=="RGB"&&t.format!=="BGR"))throw new Error("Tensor format doesn't match input tensor dims");let u=4,y=0,w=1,$=2,b=3,x=0,v=c,k=c*2,S=-1;l==="RGBA"?(x=0,v=c,k=c*2,S=c*3):l==="RGB"?(x=0,v=c,k=c*2):l==="RBG"&&(x=0,k=c,v=c*2),i=r.createImageData(a,s);for(let E=0;E<s*a;y+=u,w+=u,$+=u,b+=u,E++)i.data[y]=(e.data[x++]-f[0])*p[0],i.data[w]=(e.data[v++]-f[1])*p[1],i.data[$]=(e.data[k++]-f[2])*p[2],i.data[b]=S===-1?255:(e.data[S++]-f[3])*p[3]}else throw new Error("Can not access image data");return i}}),mr,Ml,Pl,Dl,Ul,Nl,Rf=D(()=>{ya(),mr=(e,t)=>{if(e===void 0)throw new Error("Image buffer must be defined");if(t.height===void 0||t.width===void 0)throw new Error("Image height and width must be defined");if(t.tensorLayout==="NHWC")throw new Error("NHWC Tensor layout is not supported yet");let{height:r,width:i}=t,a=t.norm??{mean:255,bias:0},s,n;typeof a.mean=="number"?s=[a.mean,a.mean,a.mean,a.mean]:s=[a.mean[0],a.mean[1],a.mean[2],a.mean[3]??255],typeof a.bias=="number"?n=[a.bias,a.bias,a.bias,a.bias]:n=[a.bias[0],a.bias[1],a.bias[2],a.bias[3]??0];let l=t.format!==void 0?t.format:"RGBA",d=t.tensorFormat!==void 0&&t.tensorFormat!==void 0?t.tensorFormat:"RGB",p=r*i,f=d==="RGBA"?new Float32Array(p*4):new Float32Array(p*3),c=4,u=0,y=1,w=2,$=3,b=0,x=p,v=p*2,k=-1;l==="RGB"&&(c=3,u=0,y=1,w=2,$=-1),d==="RGBA"?k=p*3:d==="RBG"?(b=0,v=p,x=p*2):d==="BGR"&&(v=0,x=p,b=p*2);for(let S=0;S<p;S++,u+=c,w+=c,y+=c,$+=c)f[b++]=(e[u]+n[0])/s[0],f[x++]=(e[y]+n[1])/s[1],f[v++]=(e[w]+n[2])/s[2],k!==-1&&$!==-1&&(f[k++]=(e[$]+n[3])/s[3]);return d==="RGBA"?new Pe("float32",f,[1,4,r,i]):new Pe("float32",f,[1,3,r,i])},Ml=async(e,t)=>{let r=typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement,i=typeof ImageData<"u"&&e instanceof ImageData,a=typeof ImageBitmap<"u"&&e instanceof ImageBitmap,s=typeof e=="string",n,l=t??{},d=()=>{if(typeof document<"u")return document.createElement("canvas");if(typeof OffscreenCanvas<"u")return new OffscreenCanvas(1,1);throw new Error("Canvas is not supported")},p=f=>typeof HTMLCanvasElement<"u"&&f instanceof HTMLCanvasElement||f instanceof OffscreenCanvas?f.getContext("2d"):null;if(r){let f=d();f.width=e.width,f.height=e.height;let c=p(f);if(c!=null){let u=e.height,y=e.width;if(t!==void 0&&t.resizedHeight!==void 0&&t.resizedWidth!==void 0&&(u=t.resizedHeight,y=t.resizedWidth),t!==void 0){if(l=t,t.tensorFormat!==void 0)throw new Error("Image input config format must be RGBA for HTMLImageElement");l.tensorFormat="RGBA",l.height=u,l.width=y}else l.tensorFormat="RGBA",l.height=u,l.width=y;c.drawImage(e,0,0),n=c.getImageData(0,0,y,u).data}else throw new Error("Can not access image data")}else if(i){let f,c;if(t!==void 0&&t.resizedWidth!==void 0&&t.resizedHeight!==void 0?(f=t.resizedHeight,c=t.resizedWidth):(f=e.height,c=e.width),t!==void 0&&(l=t),l.format="RGBA",l.height=f,l.width=c,t!==void 0){let u=d();u.width=c,u.height=f;let y=p(u);if(y!=null)y.putImageData(e,0,0),n=y.getImageData(0,0,c,f).data;else throw new Error("Can not access image data")}else n=e.data}else if(a){if(t===void 0)throw new Error("Please provide image config with format for Imagebitmap");let f=d();f.width=e.width,f.height=e.height;let c=p(f);if(c!=null){let u=e.height,y=e.width;return c.drawImage(e,0,0,y,u),n=c.getImageData(0,0,y,u).data,l.height=u,l.width=y,mr(n,l)}else throw new Error("Can not access image data")}else{if(s)return new Promise((f,c)=>{let u=d(),y=p(u);if(!e||!y)return c();let w=new Image;w.crossOrigin="Anonymous",w.src=e,w.onload=()=>{u.width=w.width,u.height=w.height,y.drawImage(w,0,0,u.width,u.height);let $=y.getImageData(0,0,u.width,u.height);l.height=u.height,l.width=u.width,f(mr($.data,l))}});throw new Error("Input data provided is not supported - aborted tensor creation")}if(n!==void 0)return mr(n,l);throw new Error("Input data provided is not supported - aborted tensor creation")},Pl=(e,t)=>{let{width:r,height:i,download:a,dispose:s}=t,n=[1,i,r,4];return new Pe({location:"texture",type:"float32",texture:e,dims:n,download:a,dispose:s})},Dl=(e,t)=>{let{dataType:r,dims:i,download:a,dispose:s}=t;return new Pe({location:"gpu-buffer",type:r??"float32",gpuBuffer:e,dims:i,download:a,dispose:s})},Ul=(e,t)=>{let{dataType:r,dims:i,download:a,dispose:s}=t;return new Pe({location:"ml-tensor",type:r??"float32",mlTensor:e,dims:i,download:a,dispose:s})},Nl=(e,t,r)=>new Pe({location:"cpu-pinned",type:e,data:t,dims:r??[t.length]})}),St,Ht,pi,Wl,Bf=D(()=>{St=new Map([["float32",Float32Array],["uint8",Uint8Array],["int8",Int8Array],["uint16",Uint16Array],["int16",Int16Array],["int32",Int32Array],["bool",Uint8Array],["float64",Float64Array],["uint32",Uint32Array],["int4",Uint8Array],["uint4",Uint8Array]]),Ht=new Map([[Float32Array,"float32"],[Uint8Array,"uint8"],[Int8Array,"int8"],[Uint16Array,"uint16"],[Int16Array,"int16"],[Int32Array,"int32"],[Float64Array,"float64"],[Uint32Array,"uint32"]]),pi=!1,Wl=()=>{if(!pi){pi=!0;let e=typeof BigInt64Array<"u"&&BigInt64Array.from,t=typeof BigUint64Array<"u"&&BigUint64Array.from,r=typeof Float16Array<"u"&&Float16Array.from;e&&(St.set("int64",BigInt64Array),Ht.set(BigInt64Array,"int64")),t&&(St.set("uint64",BigUint64Array),Ht.set(BigUint64Array,"uint64")),r?(St.set("float16",Float16Array),Ht.set(Float16Array,"float16")):St.set("float16",Uint16Array)}}}),ql,Vl,Mf=D(()=>{ya(),ql=e=>{let t=1;for(let r=0;r<e.length;r++){let i=e[r];if(typeof i!="number"||!Number.isSafeInteger(i))throw new TypeError(`dims[${r}] must be an integer, got: ${i}`);if(i<0)throw new RangeError(`dims[${r}] must be a non-negative integer, got: ${i}`);t*=i}return t},Vl=(e,t)=>{switch(e.location){case"cpu":return new Pe(e.type,e.data,t);case"cpu-pinned":return new Pe({location:"cpu-pinned",data:e.data,type:e.type,dims:t});case"texture":return new Pe({location:"texture",texture:e.texture,type:e.type,dims:t});case"gpu-buffer":return new Pe({location:"gpu-buffer",gpuBuffer:e.gpuBuffer,type:e.type,dims:t});case"ml-tensor":return new Pe({location:"ml-tensor",mlTensor:e.mlTensor,type:e.type,dims:t});default:throw new Error(`tensorReshape: tensor location ${e.location} is not supported`)}}}),Pe,ya=D(()=>{Of(),Rf(),Bf(),Mf(),Pe=class{constructor(e,t,r){Wl();let i,a;if(typeof e=="object"&&"location"in e)switch(this.dataLocation=e.location,i=e.type,a=e.dims,e.location){case"cpu-pinned":{let n=St.get(i);if(!n)throw new TypeError(`unsupported type "${i}" to create tensor from pinned buffer`);if(!(e.data instanceof n))throw new TypeError(`buffer should be of type ${n.name}`);this.cpuData=e.data;break}case"texture":{if(i!=="float32")throw new TypeError(`unsupported type "${i}" to create tensor from texture`);this.gpuTextureData=e.texture,this.downloader=e.download,this.disposer=e.dispose;break}case"gpu-buffer":{if(i!=="float32"&&i!=="float16"&&i!=="int32"&&i!=="int64"&&i!=="uint32"&&i!=="uint8"&&i!=="bool"&&i!=="uint4"&&i!=="int4")throw new TypeError(`unsupported type "${i}" to create tensor from gpu buffer`);this.gpuBufferData=e.gpuBuffer,this.downloader=e.download,this.disposer=e.dispose;break}case"ml-tensor":{if(i!=="float32"&&i!=="float16"&&i!=="int32"&&i!=="int64"&&i!=="uint32"&&i!=="uint64"&&i!=="int8"&&i!=="uint8"&&i!=="bool")throw new TypeError(`unsupported type "${i}" to create tensor from MLTensor`);this.mlTensorData=e.mlTensor,this.downloader=e.download,this.disposer=e.dispose;break}default:throw new Error(`Tensor constructor: unsupported location '${this.dataLocation}'`)}else{let n,l;if(typeof e=="string")if(i=e,l=r,e==="string"){if(!Array.isArray(t))throw new TypeError("A string tensor's data must be a string array.");n=t}else{let d=St.get(e);if(d===void 0)throw new TypeError(`Unsupported tensor type: ${e}.`);if(Array.isArray(t)){if(e==="float16"&&d===Uint16Array||e==="uint4"||e==="int4")throw new TypeError(`Creating a ${e} tensor from number array is not supported. Please use ${d.name} as data.`);e==="uint64"||e==="int64"?n=d.from(t,BigInt):n=d.from(t)}else if(t instanceof d)n=t;else if(t instanceof Uint8ClampedArray)if(e==="uint8")n=Uint8Array.from(t);else throw new TypeError("A Uint8ClampedArray tensor's data must be type of uint8");else throw new TypeError(`A ${i} tensor's data must be type of ${d}`)}else if(l=t,Array.isArray(e)){if(e.length===0)throw new TypeError("Tensor type cannot be inferred from an empty array.");let d=typeof e[0];if(d==="string")i="string",n=e;else if(d==="boolean")i="bool",n=Uint8Array.from(e);else throw new TypeError(`Invalid element type of data array: ${d}.`)}else if(e instanceof Uint8ClampedArray)i="uint8",n=Uint8Array.from(e);else{let d=Ht.get(e.constructor);if(d===void 0)throw new TypeError(`Unsupported type for tensor data: ${e.constructor}.`);i=d,n=e}if(l===void 0)l=[n.length];else if(!Array.isArray(l))throw new TypeError("A tensor's dims must be a number array");a=l,this.cpuData=n,this.dataLocation="cpu"}let s=ql(a);if(this.cpuData&&s!==this.cpuData.length&&!((i==="uint4"||i==="int4")&&Math.ceil(s/2)===this.cpuData.length))throw new Error(`Tensor's size(${s}) does not match data length(${this.cpuData.length}).`);this.type=i,this.dims=a,this.size=s}static async fromImage(e,t){return Ml(e,t)}static fromTexture(e,t){return Pl(e,t)}static fromGpuBuffer(e,t){return Dl(e,t)}static fromMLTensor(e,t){return Ul(e,t)}static fromPinnedBuffer(e,t,r){return Nl(e,t,r)}toDataURL(e){return Rl(this,e)}toImageData(e){return Bl(this,e)}get data(){if(this.ensureValid(),!this.cpuData)throw new Error("The data is not on CPU. Use `getData()` to download GPU data to CPU, or use `texture` or `gpuBuffer` property to access the GPU data directly.");return this.cpuData}get location(){return this.dataLocation}get texture(){if(this.ensureValid(),!this.gpuTextureData)throw new Error("The data is not stored as a WebGL texture.");return this.gpuTextureData}get gpuBuffer(){if(this.ensureValid(),!this.gpuBufferData)throw new Error("The data is not stored as a WebGPU buffer.");return this.gpuBufferData}get mlTensor(){if(this.ensureValid(),!this.mlTensorData)throw new Error("The data is not stored as a WebNN MLTensor.");return this.mlTensorData}async getData(e){switch(this.ensureValid(),this.dataLocation){case"cpu":case"cpu-pinned":return this.data;case"texture":case"gpu-buffer":case"ml-tensor":{if(!this.downloader)throw new Error("The current tensor is not created with a specified data downloader.");if(this.isDownloading)throw new Error("The current tensor is being downloaded.");try{this.isDownloading=!0;let t=await this.downloader();return this.downloader=void 0,this.dataLocation="cpu",this.cpuData=t,e&&this.disposer&&(this.disposer(),this.disposer=void 0),t}finally{this.isDownloading=!1}}default:throw new Error(`cannot get data from location: ${this.dataLocation}`)}}dispose(){if(this.isDownloading)throw new Error("The current tensor is being downloaded.");this.disposer&&(this.disposer(),this.disposer=void 0),this.cpuData=void 0,this.gpuTextureData=void 0,this.gpuBufferData=void 0,this.mlTensorData=void 0,this.downloader=void 0,this.isDownloading=void 0,this.dataLocation="none"}ensureValid(){if(this.dataLocation==="none")throw new Error("The tensor is disposed.")}reshape(e){if(this.ensureValid(),this.downloader||this.disposer)throw new Error("Cannot reshape a tensor that owns GPU resource.");return Vl(this,e)}}}),Be,wa=D(()=>{ya(),Be=Pe}),zr,hi,Je,He,Ll=D(()=>{Ol(),zr=(e,t)=>{(typeof qe.trace>"u"?!qe.wasm.trace:!qe.trace)||console.timeStamp(`${e}::ORT::${t}`)},hi=(e,t)=>{var a;let r=((a=new Error().stack)==null?void 0:a.split(/\r\n|\r|\n/g))||[],i=!1;for(let s=0;s<r.length;s++){if(i&&!r[s].includes("TRACE_FUNC")){let n=`FUNC_${e}::${r[s].trim().split(" ")[1]}`;t&&(n+=`::${t}`),zr("CPU",n);return}r[s].includes("TRACE_FUNC")&&(i=!0)}},Je=e=>{(typeof qe.trace>"u"?!qe.wasm.trace:!qe.trace)||hi("BEGIN",e)},He=e=>{(typeof qe.trace>"u"?!qe.wasm.trace:!qe.trace)||hi("END",e)}}),jl,Pf=D(()=>{ga(),wa(),Ll(),jl=class Gl{constructor(t){this.handler=t}async run(t,r,i){Je();let a={},s={};if(typeof t!="object"||t===null||t instanceof Be||Array.isArray(t))throw new TypeError("'feeds' must be an object that use input names as keys and OnnxValue as corresponding values.");let n=!0;if(typeof r=="object"){if(r===null)throw new TypeError("Unexpected argument[1]: cannot be null.");if(r instanceof Be)throw new TypeError("'fetches' cannot be a Tensor");if(Array.isArray(r)){if(r.length===0)throw new TypeError("'fetches' cannot be an empty array.");n=!1;for(let p of r){if(typeof p!="string")throw new TypeError("'fetches' must be a string array or an object.");if(this.outputNames.indexOf(p)===-1)throw new RangeError(`'fetches' contains invalid output name: ${p}.`);a[p]=null}if(typeof i=="object"&&i!==null)s=i;else if(typeof i<"u")throw new TypeError("'options' must be an object.")}else{let p=!1,f=Object.getOwnPropertyNames(r);for(let c of this.outputNames)if(f.indexOf(c)!==-1){let u=r[c];(u===null||u instanceof Be)&&(p=!0,n=!1,a[c]=u)}if(p){if(typeof i=="object"&&i!==null)s=i;else if(typeof i<"u")throw new TypeError("'options' must be an object.")}else s=r}}else if(typeof r<"u")throw new TypeError("Unexpected argument[1]: must be 'fetches' or 'options'.");for(let p of this.inputNames)if(typeof t[p]>"u")throw new Error(`input '${p}' is missing in 'feeds'.`);if(n)for(let p of this.outputNames)a[p]=null;let l=await this.handler.run(t,a,s),d={};for(let p in l)if(Object.hasOwnProperty.call(l,p)){let f=l[p];f instanceof Be?d[p]=f:d[p]=new Be(f.type,f.data,f.dims)}return He(),d}async release(){return this.handler.dispose()}static async create(t,r,i,a){Je();let s,n={};if(typeof t=="string"){if(s=t,typeof r=="object"&&r!==null)n=r;else if(typeof r<"u")throw new TypeError("'options' must be an object.")}else if(t instanceof Uint8Array){if(s=t,typeof r=="object"&&r!==null)n=r;else if(typeof r<"u")throw new TypeError("'options' must be an object.")}else if(t instanceof ArrayBuffer||typeof SharedArrayBuffer<"u"&&t instanceof SharedArrayBuffer){let f=t,c=0,u=t.byteLength;if(typeof r=="object"&&r!==null)n=r;else if(typeof r=="number"){if(c=r,!Number.isSafeInteger(c))throw new RangeError("'byteOffset' must be an integer.");if(c<0||c>=f.byteLength)throw new RangeError(`'byteOffset' is out of range [0, ${f.byteLength}).`);if(u=t.byteLength-c,typeof i=="number"){if(u=i,!Number.isSafeInteger(u))throw new RangeError("'byteLength' must be an integer.");if(u<=0||c+u>f.byteLength)throw new RangeError(`'byteLength' is out of range (0, ${f.byteLength-c}].`);if(typeof a=="object"&&a!==null)n=a;else if(typeof a<"u")throw new TypeError("'options' must be an object.")}else if(typeof i<"u")throw new TypeError("'byteLength' must be a number.")}else if(typeof r<"u")throw new TypeError("'options' must be an object.");s=new Uint8Array(f,c,u)}else throw new TypeError("Unexpected argument[0]: must be 'path' or 'buffer'.");let[l,d]=await ma(n),p=await l.createInferenceSessionHandler(s,d);return He(),new Gl(p)}startProfiling(){this.handler.startProfiling()}endProfiling(){this.handler.endProfiling()}get inputNames(){return this.handler.inputNames}get outputNames(){return this.handler.outputNames}}}),Fl,Df=D(()=>{Pf(),Fl=jl}),Uf=D(()=>{}),Nf=D(()=>{}),Wf=D(()=>{}),qf=D(()=>{}),ds,Hl,Vf=D(()=>{ga(),wa(),ds="Training backend could not be resolved. Make sure you're using the correct configuration & WebAssembly files.",Hl=class Kl{constructor(t,r,i){this.handler=t,this.hasOptimizerModel=r,this.hasEvalModel=i}get trainingInputNames(){return this.handler.inputNames}get trainingOutputNames(){return this.handler.outputNames}get evalInputNames(){if(this.hasEvalModel)return this.handler.evalInputNames;throw new Error("This training session has no evalModel loaded.")}get evalOutputNames(){if(this.hasEvalModel)return this.handler.evalOutputNames;throw new Error("This training session has no evalModel loaded.")}static async create(t,r){let i=t.evalModel||"",a=t.optimizerModel||"",s=r||{},[n,l]=await ma(s);if(n.createTrainingSessionHandler){let d=await n.createTrainingSessionHandler(t.checkpointState,t.trainModel,i,a,l);return new Kl(d,!!t.optimizerModel,!!t.evalModel)}else throw new Error(ds)}typeNarrowingForRunStep(t,r,i,a,s){let n={},l={};if(typeof i!="object"||i===null||i instanceof Be||Array.isArray(i))throw new TypeError("'feeds' must be an object that use input names as keys and OnnxValue as corresponding values.");let d=!0;if(typeof a=="object"){if(a===null)throw new TypeError("Unexpected argument[1]: cannot be null.");if(a instanceof Be)throw new TypeError("'fetches' cannot be a Tensor");if(Array.isArray(a)){if(a.length===0)throw new TypeError("'fetches' cannot be an empty array.");d=!1;for(let p of a){if(typeof p!="string")throw new TypeError("'fetches' must be a string array or an object.");if(r.indexOf(p)===-1)throw new RangeError(`'fetches' contains invalid output name: ${p}.`);n[p]=null}if(typeof s=="object"&&s!==null)l=s;else if(typeof s<"u")throw new TypeError("'options' must be an object.")}else{let p=!1,f=Object.getOwnPropertyNames(a);for(let c of r)if(f.indexOf(c)!==-1){let u=a[c];(u===null||u instanceof Be)&&(p=!0,d=!1,n[c]=u)}if(p){if(typeof s=="object"&&s!==null)l=s;else if(typeof s<"u")throw new TypeError("'options' must be an object.")}else l=a}}else if(typeof a<"u")throw new TypeError("Unexpected argument[1]: must be 'fetches' or 'options'.");for(let p of t)if(typeof i[p]>"u")throw new Error(`input '${p}' is missing in 'feeds'.`);if(d)for(let p of r)n[p]=null;return[n,l]}convertHandlerReturnTypeToMapOfTensors(t){let r={};for(let i in t)if(Object.hasOwnProperty.call(t,i)){let a=t[i];a instanceof Be?r[i]=a:r[i]=new Be(a.type,a.data,a.dims)}return r}async lazyResetGrad(){await this.handler.lazyResetGrad()}async runTrainStep(t,r,i){let[a,s]=this.typeNarrowingForRunStep(this.trainingInputNames,this.trainingOutputNames,t,r,i),n=await this.handler.runTrainStep(t,a,s);return this.convertHandlerReturnTypeToMapOfTensors(n)}async runOptimizerStep(t){if(this.hasOptimizerModel)await this.handler.runOptimizerStep(t||{});else throw new Error("This TrainingSession has no OptimizerModel loaded.")}async runEvalStep(t,r,i){if(this.hasEvalModel){let[a,s]=this.typeNarrowingForRunStep(this.evalInputNames,this.evalOutputNames,t,r,i),n=await this.handler.runEvalStep(t,a,s);return this.convertHandlerReturnTypeToMapOfTensors(n)}else throw new Error("This TrainingSession has no EvalModel loaded.")}async getParametersSize(t=!0){return this.handler.getParametersSize(t)}async loadParametersBuffer(t,r=!0){let i=await this.getParametersSize(r);if(t.length!==4*i)throw new Error("Size of the buffer passed into loadParametersBuffer must match the number of parameters in the model. Please use getParametersSize method to check.");return this.handler.loadParametersBuffer(t,r)}async getContiguousParameters(t=!0){return this.handler.getContiguousParameters(t)}async release(){return this.handler.dispose()}}}),Yl,Lf=D(()=>{Vf(),Yl=Hl}),Zl={};er(Zl,{InferenceSession:()=>Fl,TRACE:()=>zr,TRACE_FUNC_BEGIN:()=>Je,TRACE_FUNC_END:()=>He,Tensor:()=>Be,TrainingSession:()=>Yl,env:()=>me,registerBackend:()=>Rt});var Ke=D(()=>{If(),Af(),Df(),wa(),Uf(),Nf(),Ll(),Wf(),qf(),Lf()}),$a=D(()=>{}),Ql={};er(Ql,{default:()=>Xl});var ci,fi,Xl,jf=D(()=>{var e;Kh(),Et(),Ur(),ci="ort-wasm-proxy-worker",fi=((e=globalThis.self)==null?void 0:e.name)===ci,fi&&(self.onmessage=t=>{let{type:r,in:i}=t.data;try{switch(r){case"init-wasm":_a(i.wasm).then(()=>{Da(i).then(()=>{postMessage({type:r})},a=>{postMessage({type:r,err:a})})},a=>{postMessage({type:r,err:a})});break;case"init-ep":{let{epName:a,env:s}=i;Ua(s,a).then(()=>{postMessage({type:r})},n=>{postMessage({type:r,err:n})});break}case"copy-from":{let{buffer:a}=i,s=Dr(a);postMessage({type:r,out:s});break}case"create":{let{model:a,options:s}=i;Na(a,s).then(n=>{postMessage({type:r,out:n})},n=>{postMessage({type:r,err:n})});break}case"release":Wa(i),postMessage({type:r});break;case"run":{let{sessionId:a,inputIndices:s,inputs:n,outputIndices:l,options:d}=i;qa(a,s,n,l,new Array(l.length).fill(null),d).then(p=>{p.some(f=>f[3]!=="cpu")?postMessage({type:r,err:"Proxy does not support non-cpu tensor location."}):postMessage({type:r,out:p},La([...n,...p]))},p=>{postMessage({type:r,err:p})});break}case"end-profiling":Va(i),postMessage({type:r});break;default:}}catch(a){postMessage({type:r,err:a})}}),Xl=fi?null:t=>new Worker(t??Ot,{type:"module",name:ci})}),Jl={};er(Jl,{default:()=>ed});var mi,gi,ed,Gf=D(()=>{var e;gi=(mi=import.meta.url,async function(t={}){function r(){return ie.buffer!=Z.buffer&&ke(),Z}function i(){return ie.buffer!=Z.buffer&&ke(),ne}function a(){return ie.buffer!=Z.buffer&&ke(),A}function s(){return ie.buffer!=Z.buffer&&ke(),U}function n(){return ie.buffer!=Z.buffer&&ke(),Q}function l(){return ie.buffer!=Z.buffer&&ke(),ue}function d(){return ie.buffer!=Z.buffer&&ke(),$e}function p(){return ie.buffer!=Z.buffer&&ke(),tr}var f,c,u=Object.assign({},t),y=new Promise((o,h)=>{f=o,c=h}),w=typeof window=="object",$=typeof importScripts=="function",b=$&&self.name=="em-pthread";u.mountExternalData=(o,h)=>{o.startsWith("./")&&(o=o.substring(2)),(u.Fb||(u.Fb=new Map)).set(o,h)},u.unmountExternalData=()=>{delete u.Fb};var x=globalThis.SharedArrayBuffer??new WebAssembly.Memory({initial:0,maximum:0,shared:!0}).buffer.constructor;let v=()=>{let o=(m,g,_)=>(...C)=>{let R=Qe,P=g==null?void 0:g();C=m(...C);let N=g==null?void 0:g();return P!==N&&(m=N,_(P),g=_=null),Qe!=R?new Promise((q,Y)=>{ri={resolve:q,reject:Y}}):C},h=m=>async(...g)=>{var _;try{if(u.Eb)throw Error("Session already started");let C=u.Eb={fc:g[0],errors:[]},R=await m(...g);if(u.Eb!==C)throw Error("Session mismatch");(_=u.Gb)==null||_.flush();let P=C.errors;if(0<P.length){let N=await Promise.all(P);if(N=N.filter(q=>q),0<N.length)throw Error(N.join(`
`))}return R}finally{u.Eb=null}};u._OrtCreateSession=o(u._OrtCreateSession,()=>u._OrtCreateSession,m=>u._OrtCreateSession=m),u._OrtRun=h(o(u._OrtRun,()=>u._OrtRun,m=>u._OrtRun=m)),u._OrtRunWithBinding=h(o(u._OrtRunWithBinding,()=>u._OrtRunWithBinding,m=>u._OrtRunWithBinding=m)),u._OrtBindInput=o(u._OrtBindInput,()=>u._OrtBindInput,m=>u._OrtBindInput=m),v=void 0};u.jsepInit=(o,h)=>{if(v==null||v(),o==="webgpu"){[u.Gb,u.Ub,u.Yb,u.Nb,u.Xb,u.jb,u.Zb,u.bc,u.Vb,u.Wb,u.$b]=h;let m=u.Gb;u.jsepRegisterBuffer=(g,_,C,R)=>m.registerBuffer(g,_,C,R),u.jsepGetBuffer=g=>m.getBuffer(g),u.jsepCreateDownloader=(g,_,C)=>m.createDownloader(g,_,C),u.jsepOnReleaseSession=g=>{m.onReleaseSession(g)},u.jsepOnRunStart=g=>m.onRunStart(g),u.cc=(g,_)=>{m.upload(g,_)}}else if(o==="webnn"){[u.Gb,u.ac,u.Ob,u.jsepEnsureTensor,u.dc,u.jsepDownloadTensor]=h,u.jsepReleaseTensorId=u.Ob;let m=u.Gb;u.jsepOnRunStart=g=>m.onRunStart(g),u.jsepRegisterMLContext=(g,_)=>{m.registerMLContext(g,_)},u.jsepOnReleaseSession=g=>{m.onReleaseSession(g)},u.jsepCreateMLTensorDownloader=(g,_)=>m.createMLTensorDownloader(g,_),u.jsepRegisterMLTensor=(g,_,C)=>m.registerMLTensor(g,_,C)}};var k,S,E=Object.assign({},u),z="./this.program",T=(o,h)=>{throw h},M="";(w||$)&&($?M=self.location.href:typeof document<"u"&&document.currentScript&&(M=document.currentScript.src),mi&&(M=mi),M=M.startsWith("blob:")?"":M.substr(0,M.replace(/[?#].*/,"").lastIndexOf("/")+1),$&&(S=o=>{var h=new XMLHttpRequest;return h.open("GET",o,!1),h.responseType="arraybuffer",h.send(null),new Uint8Array(h.response)}),k=(o,h,m)=>{var g=new XMLHttpRequest;g.open("GET",o,!0),g.responseType="arraybuffer",g.onload=()=>{g.status==200||g.status==0&&g.response?h(g.response):m()},g.onerror=m,g.send(null)});var W,V=console.log.bind(console),J=console.error.bind(console),ee=V,H=J;if(Object.assign(u,E),E=null,b){let o=function(h){try{var m=h.data,g=m.cmd;if(g==="load"){let _=[];self.onmessage=C=>_.push(C),self.startWorker=()=>{postMessage({cmd:"loaded"});for(let C of _)o(C);self.onmessage=o};for(let C of m.handlers)u[C]&&!u[C].proxy||(u[C]=(...R)=>{postMessage({Mb:"callHandler",oc:C,args:R})},C=="print"&&(ee=u[C]),C=="printErr"&&(H=u[C]));ie=m.wasmMemory,ke(),oe(m.wasmModule)}else if(g==="run"){si(m.pthread_ptr,0,0,1,0,0),Jr(m.pthread_ptr),uc(),Ja(),he||(Qn(),he=!0);try{lc(m.start_routine,m.arg)}catch(_){if(_!="unwind")throw _}}else g==="cancel"?zt()&&cr(-1):m.target!=="setimmediate"&&(g==="checkMailbox"?he&&ar():g&&(H(`worker: received unknown command ${g}`),H(m)))}catch(_){throw Xn(),_}};var oe,he=!1;H=function(...h){h=h.join(" "),console.error(h)},self.alert=function(...h){postMessage({Mb:"alert",text:h.join(" "),qc:zt()})},u.instantiateWasm=(h,m)=>new Promise(g=>{oe=_=>{_=new WebAssembly.Instance(_,Ka()),m(_),g()}}),self.onunhandledrejection=h=>{throw h.reason||h},self.onmessage=o}u.wasmBinary&&(W=u.wasmBinary);var ie,de,j,Z,ne,A,U,Q,ue,$e,ve,it,tr,Oe=!1;function ke(){var o=ie.buffer;u.HEAP8=Z=new Int8Array(o),u.HEAP16=A=new Int16Array(o),u.HEAPU8=ne=new Uint8Array(o),u.HEAPU16=U=new Uint16Array(o),u.HEAP32=Q=new Int32Array(o),u.HEAPU32=ue=new Uint32Array(o),u.HEAPF32=$e=new Float32Array(o),u.HEAPF64=tr=new Float64Array(o),u.HEAP64=ve=new BigInt64Array(o),u.HEAPU64=it=new BigUint64Array(o)}if(!b){if(!((ie=new WebAssembly.Memory({initial:256,maximum:65536,shared:!0})).buffer instanceof x))throw H("requested a shared WebAssembly.Memory but the returned buffer is not a SharedArrayBuffer, indicating that while the browser has SharedArrayBuffer it does not have WebAssembly threads support - you may need to set a flag"),Error("bad memory");ke()}var wt=[],xe=[],Te=[],Ue=0,at=null;function rr(){if(--Ue==0&&at){var o=at;at=null,o()}}function Ct(o){throw H(o="Aborted("+o+")"),Oe=!0,j=1,o=new WebAssembly.RuntimeError(o+". Build with -sASSERTIONS for more info."),c(o),o}var qr,ja=o=>o.startsWith("data:application/octet-stream;base64,"),Ga=o=>o.startsWith("file://");function Fa(o){if(o==qr&&W)return new Uint8Array(W);if(S)return S(o);throw"both async and sync fetching of the wasm failed"}function Ha(o,h,m){return function(g){if(!W&&(w||$)){if(typeof fetch=="function"&&!Ga(g))return fetch(g,{credentials:"same-origin"}).then(_=>{if(!_.ok)throw`failed to load wasm binary file at '${g}'`;return _.arrayBuffer()}).catch(()=>Fa(g));if(k)return new Promise((_,C)=>{k(g,R=>_(new Uint8Array(R)),C)})}return Promise.resolve().then(()=>Fa(g))}(o).then(g=>WebAssembly.instantiate(g,h)).then(m,g=>{H(`failed to asynchronously prepare wasm: ${g}`),Ct(g)})}function Ka(){return{a:{O:oc,Aa:sc,b:pc,aa:an,B:on,qa:un,Y:dn,_:pn,ra:hn,oa:cn,ha:fn,na:mn,L:gn,Z:yn,W:wn,pa:$n,X:_n,wa:hc,F:cc,Q:fc,P:gc,E:wc,u:$c,q:_c,G:vc,A:Tc,R:Ic,ua:zc,ka:Ac,U:Oc,ba:Rc,H:Bc,ja:Jr,ta:Mc,t:Pc,x:Nc,o:Wc,l:Vc,c:Qr,n:Lc,j:Fc,w:Hc,p:Kc,g:Yc,s:Zc,m:Qc,e:Xc,k:Jc,i:ef,h:tf,d:rf,ea:af,fa:nf,ga:sf,ca:Bn,da:Mn,T:of,f:uf,D:lf,I:df,M:pf,y:hf,sa:cf,V:ff,v:Dn,z:mf,N:gf,S:yf,za:wf,ya:$f,la:Wn,ma:qn,$:Fr,C:Vn,K:Ln,ia:jn,J:Gn,a:ie,xa:Gr,va:Kn,r:bf}}}var Vr={868340:(o,h,m,g,_)=>{if(u===void 0||!u.Fb)return 1;if((o=Ce(o>>>0)).startsWith("./")&&(o=o.substring(2)),!(o=u.Fb.get(o)))return 2;if(g>>>=0,(h>>>=0)+(m>>>=0)>o.byteLength)return 3;try{let C=o.subarray(h,h+m);switch(_){case 0:i().set(C,g>>>0);break;case 1:u.cc(g,C);break;default:return 4}return 0}catch{return 4}},869023:(o,h,m)=>{u.dc(o,i().subarray(h>>>0,h+m>>>0))},869086:()=>u.ac(),869127:o=>{u.Ob(o)},869163:()=>{u.Vb()},869194:()=>{u.Wb()},869223:()=>{u.$b()},869248:o=>u.Ub(o),869281:o=>u.Yb(o),869313:(o,h,m)=>{u.Nb(o,h,m,!0)},869352:(o,h,m)=>{u.Nb(o,h,m)},869385:()=>typeof wasmOffsetConverter<"u",869442:o=>{u.jb("Abs",o,void 0)},869493:o=>{u.jb("Neg",o,void 0)},869544:o=>{u.jb("Floor",o,void 0)},869597:o=>{u.jb("Ceil",o,void 0)},869649:o=>{u.jb("Reciprocal",o,void 0)},869707:o=>{u.jb("Sqrt",o,void 0)},869759:o=>{u.jb("Exp",o,void 0)},869810:o=>{u.jb("Erf",o,void 0)},869861:o=>{u.jb("Sigmoid",o,void 0)},869916:(o,h,m)=>{u.jb("HardSigmoid",o,{alpha:h,beta:m})},869995:o=>{u.jb("Log",o,void 0)},870046:o=>{u.jb("Sin",o,void 0)},870097:o=>{u.jb("Cos",o,void 0)},870148:o=>{u.jb("Tan",o,void 0)},870199:o=>{u.jb("Asin",o,void 0)},870251:o=>{u.jb("Acos",o,void 0)},870303:o=>{u.jb("Atan",o,void 0)},870355:o=>{u.jb("Sinh",o,void 0)},870407:o=>{u.jb("Cosh",o,void 0)},870459:o=>{u.jb("Asinh",o,void 0)},870512:o=>{u.jb("Acosh",o,void 0)},870565:o=>{u.jb("Atanh",o,void 0)},870618:o=>{u.jb("Tanh",o,void 0)},870670:o=>{u.jb("Not",o,void 0)},870721:(o,h,m)=>{u.jb("Clip",o,{min:h,max:m})},870790:o=>{u.jb("Clip",o,void 0)},870842:(o,h)=>{u.jb("Elu",o,{alpha:h})},870900:o=>{u.jb("Gelu",o,void 0)},870952:o=>{u.jb("Relu",o,void 0)},871004:(o,h)=>{u.jb("LeakyRelu",o,{alpha:h})},871068:(o,h)=>{u.jb("ThresholdedRelu",o,{alpha:h})},871138:(o,h)=>{u.jb("Cast",o,{to:h})},871196:o=>{u.jb("Add",o,void 0)},871247:o=>{u.jb("Sub",o,void 0)},871298:o=>{u.jb("Mul",o,void 0)},871349:o=>{u.jb("Div",o,void 0)},871400:o=>{u.jb("Pow",o,void 0)},871451:o=>{u.jb("Equal",o,void 0)},871504:o=>{u.jb("Greater",o,void 0)},871559:o=>{u.jb("GreaterOrEqual",o,void 0)},871621:o=>{u.jb("Less",o,void 0)},871673:o=>{u.jb("LessOrEqual",o,void 0)},871732:(o,h,m,g,_)=>{u.jb("ReduceMean",o,{keepDims:!!h,noopWithEmptyAxes:!!m,axes:g?Array.from(n().subarray(g>>>0,_>>>0)):[]})},871891:(o,h,m,g,_)=>{u.jb("ReduceMax",o,{keepDims:!!h,noopWithEmptyAxes:!!m,axes:g?Array.from(n().subarray(g>>>0,_>>>0)):[]})},872049:(o,h,m,g,_)=>{u.jb("ReduceMin",o,{keepDims:!!h,noopWithEmptyAxes:!!m,axes:g?Array.from(n().subarray(g>>>0,_>>>0)):[]})},872207:(o,h,m,g,_)=>{u.jb("ReduceProd",o,{keepDims:!!h,noopWithEmptyAxes:!!m,axes:g?Array.from(n().subarray(g>>>0,_>>>0)):[]})},872366:(o,h,m,g,_)=>{u.jb("ReduceSum",o,{keepDims:!!h,noopWithEmptyAxes:!!m,axes:g?Array.from(n().subarray(g>>>0,_>>>0)):[]})},872524:(o,h,m,g,_)=>{u.jb("ReduceL1",o,{keepDims:!!h,noopWithEmptyAxes:!!m,axes:g?Array.from(n().subarray(g>>>0,_>>>0)):[]})},872681:(o,h,m,g,_)=>{u.jb("ReduceL2",o,{keepDims:!!h,noopWithEmptyAxes:!!m,axes:g?Array.from(n().subarray(g>>>0,_>>>0)):[]})},872838:(o,h,m,g,_)=>{u.jb("ReduceLogSum",o,{keepDims:!!h,noopWithEmptyAxes:!!m,axes:g?Array.from(n().subarray(g>>>0,_>>>0)):[]})},872999:(o,h,m,g,_)=>{u.jb("ReduceSumSquare",o,{keepDims:!!h,noopWithEmptyAxes:!!m,axes:g?Array.from(n().subarray(g>>>0,_>>>0)):[]})},873163:(o,h,m,g,_)=>{u.jb("ReduceLogSumExp",o,{keepDims:!!h,noopWithEmptyAxes:!!m,axes:g?Array.from(n().subarray(g>>>0,_>>>0)):[]})},873327:o=>{u.jb("Where",o,void 0)},873380:(o,h,m)=>{u.jb("Transpose",o,{perm:h?Array.from(n().subarray(h>>>0,m>>>0)):[]})},873488:(o,h,m,g)=>{u.jb("DepthToSpace",o,{blocksize:h,mode:Ce(m),format:g?"NHWC":"NCHW"})},873621:(o,h,m,g)=>{u.jb("DepthToSpace",o,{blocksize:h,mode:Ce(m),format:g?"NHWC":"NCHW"})},873754:(o,h,m,g,_,C,R,P,N,q,Y,se,pe,I,ae)=>{u.jb("ConvTranspose",o,{format:N?"NHWC":"NCHW",autoPad:h,dilations:[m],group:g,kernelShape:[_],pads:[C,R],strides:[P],wIsConst:()=>!!r()[q>>>0],outputPadding:Y?Array.from(n().subarray(Y>>>0,se>>>0)):[],outputShape:pe?Array.from(n().subarray(pe>>>0,I>>>0)):[],activation:Ce(ae)})},874155:(o,h,m,g,_,C,R,P,N,q,Y,se,pe,I)=>{u.jb("ConvTranspose",o,{format:P?"NHWC":"NCHW",autoPad:h,dilations:Array.from(n().subarray(m>>>0,2+(m>>>0)>>>0)),group:g,kernelShape:Array.from(n().subarray(_>>>0,2+(_>>>0)>>>0)),pads:Array.from(n().subarray(C>>>0,4+(C>>>0)>>>0)),strides:Array.from(n().subarray(R>>>0,2+(R>>>0)>>>0)),wIsConst:()=>!!r()[N>>>0],outputPadding:q?Array.from(n().subarray(q>>>0,Y>>>0)):[],outputShape:se?Array.from(n().subarray(se>>>0,pe>>>0)):[],activation:Ce(I)})},874720:(o,h,m,g,_,C,R,P,N,q,Y,se,pe,I,ae)=>{u.jb("ConvTranspose",o,{format:N?"NHWC":"NCHW",autoPad:h,dilations:[m],group:g,kernelShape:[_],pads:[C,R],strides:[P],wIsConst:()=>!!r()[q>>>0],outputPadding:Y?Array.from(n().subarray(Y>>>0,se>>>0)):[],outputShape:pe?Array.from(n().subarray(pe>>>0,I>>>0)):[],activation:Ce(ae)})},875121:(o,h,m,g,_,C,R,P,N,q,Y,se,pe,I)=>{u.jb("ConvTranspose",o,{format:P?"NHWC":"NCHW",autoPad:h,dilations:Array.from(n().subarray(m>>>0,2+(m>>>0)>>>0)),group:g,kernelShape:Array.from(n().subarray(_>>>0,2+(_>>>0)>>>0)),pads:Array.from(n().subarray(C>>>0,4+(C>>>0)>>>0)),strides:Array.from(n().subarray(R>>>0,2+(R>>>0)>>>0)),wIsConst:()=>!!r()[N>>>0],outputPadding:q?Array.from(n().subarray(q>>>0,Y>>>0)):[],outputShape:se?Array.from(n().subarray(se>>>0,pe>>>0)):[],activation:Ce(I)})},875686:(o,h)=>{u.jb("GlobalAveragePool",o,{format:h?"NHWC":"NCHW"})},875777:(o,h,m,g,_,C,R,P,N,q,Y,se,pe,I)=>{u.jb("AveragePool",o,{format:I?"NHWC":"NCHW",auto_pad:h,ceil_mode:m,count_include_pad:g,storage_order:_,dilations:C?Array.from(n().subarray(C>>>0,R>>>0)):[],kernel_shape:P?Array.from(n().subarray(P>>>0,N>>>0)):[],pads:q?Array.from(n().subarray(q>>>0,Y>>>0)):[],strides:se?Array.from(n().subarray(se>>>0,pe>>>0)):[]})},876192:(o,h)=>{u.jb("GlobalAveragePool",o,{format:h?"NHWC":"NCHW"})},876283:(o,h,m,g,_,C,R,P,N,q,Y,se,pe,I)=>{u.jb("AveragePool",o,{format:I?"NHWC":"NCHW",auto_pad:h,ceil_mode:m,count_include_pad:g,storage_order:_,dilations:C?Array.from(n().subarray(C>>>0,R>>>0)):[],kernel_shape:P?Array.from(n().subarray(P>>>0,N>>>0)):[],pads:q?Array.from(n().subarray(q>>>0,Y>>>0)):[],strides:se?Array.from(n().subarray(se>>>0,pe>>>0)):[]})},876698:(o,h)=>{u.jb("GlobalMaxPool",o,{format:h?"NHWC":"NCHW"})},876785:(o,h,m,g,_,C,R,P,N,q,Y,se,pe,I)=>{u.jb("MaxPool",o,{format:I?"NHWC":"NCHW",auto_pad:h,ceil_mode:m,count_include_pad:g,storage_order:_,dilations:C?Array.from(n().subarray(C>>>0,R>>>0)):[],kernel_shape:P?Array.from(n().subarray(P>>>0,N>>>0)):[],pads:q?Array.from(n().subarray(q>>>0,Y>>>0)):[],strides:se?Array.from(n().subarray(se>>>0,pe>>>0)):[]})},877196:(o,h)=>{u.jb("GlobalMaxPool",o,{format:h?"NHWC":"NCHW"})},877283:(o,h,m,g,_,C,R,P,N,q,Y,se,pe,I)=>{u.jb("MaxPool",o,{format:I?"NHWC":"NCHW",auto_pad:h,ceil_mode:m,count_include_pad:g,storage_order:_,dilations:C?Array.from(n().subarray(C>>>0,R>>>0)):[],kernel_shape:P?Array.from(n().subarray(P>>>0,N>>>0)):[],pads:q?Array.from(n().subarray(q>>>0,Y>>>0)):[],strides:se?Array.from(n().subarray(se>>>0,pe>>>0)):[]})},877694:(o,h,m,g,_)=>{u.jb("Gemm",o,{alpha:h,beta:m,transA:g,transB:_})},877798:o=>{u.jb("MatMul",o,void 0)},877852:(o,h,m,g)=>{u.jb("ArgMax",o,{keepDims:!!h,selectLastIndex:!!m,axis:g})},877960:(o,h,m,g)=>{u.jb("ArgMin",o,{keepDims:!!h,selectLastIndex:!!m,axis:g})},878068:(o,h)=>{u.jb("Softmax",o,{axis:h})},878131:(o,h)=>{u.jb("Concat",o,{axis:h})},878191:(o,h,m,g,_)=>{u.jb("Split",o,{axis:h,numOutputs:m,splitSizes:g?Array.from(n().subarray(g>>>0,_>>>0)):[]})},878331:o=>{u.jb("Expand",o,void 0)},878385:(o,h)=>{u.jb("Gather",o,{axis:Number(h)})},878456:(o,h)=>{u.jb("GatherElements",o,{axis:Number(h)})},878535:(o,h,m,g,_,C,R,P,N,q,Y)=>{u.jb("Resize",o,{antialias:h,axes:m?Array.from(n().subarray(m>>>0,g>>>0)):[],coordinateTransformMode:Ce(_),cubicCoeffA:C,excludeOutside:R,extrapolationValue:P,keepAspectRatioPolicy:Ce(N),mode:Ce(q),nearestMode:Ce(Y)})},878881:(o,h,m,g,_,C,R)=>{u.jb("Slice",o,{starts:h?Array.from(n().subarray(h>>>0,m>>>0)):[],ends:g?Array.from(n().subarray(g>>>0,_>>>0)):[],axes:C?Array.from(n().subarray(C>>>0,R>>>0)):[]})},879097:o=>{u.jb("Tile",o,void 0)},879149:(o,h,m)=>{u.jb("InstanceNormalization",o,{epsilon:h,format:m?"NHWC":"NCHW"})},879263:(o,h,m)=>{u.jb("InstanceNormalization",o,{epsilon:h,format:m?"NHWC":"NCHW"})},879377:o=>{u.jb("Range",o,void 0)},879430:(o,h)=>{u.jb("Einsum",o,{equation:Ce(h)})},879511:(o,h,m,g,_)=>{u.jb("Pad",o,{mode:h,value:m,pads:g?Array.from(n().subarray(g>>>0,_>>>0)):[]})},879638:(o,h,m,g,_,C)=>{u.jb("BatchNormalization",o,{epsilon:h,momentum:m,spatial:!!_,trainingMode:!!g,format:C?"NHWC":"NCHW"})},879807:(o,h,m,g,_,C)=>{u.jb("BatchNormalization",o,{epsilon:h,momentum:m,spatial:!!_,trainingMode:!!g,format:C?"NHWC":"NCHW"})},879976:(o,h,m)=>{u.jb("CumSum",o,{exclusive:Number(h),reverse:Number(m)})},880073:(o,h,m)=>{u.jb("DequantizeLinear",o,{axis:h,blockSize:m})},880163:(o,h,m,g,_,C,R,P,N)=>{u.jb("Attention",o,{numHeads:h,isUnidirectional:m,maskFilterValue:g,scale:_,doRotary:C,qkvHiddenSizes:R?Array.from(n().subarray(Number(P)>>>0,Number(P)+R>>>0)):[],pastPresentShareBuffer:!!N})},880435:o=>{u.jb("BiasAdd",o,void 0)},880490:o=>{u.jb("BiasSplitGelu",o,void 0)},880551:o=>{u.jb("FastGelu",o,void 0)},880607:(o,h,m,g,_,C,R,P,N,q,Y,se,pe,I,ae,ye)=>{u.jb("Conv",o,{format:se?"NHWC":"NCHW",auto_pad:h,dilations:m?Array.from(n().subarray(m>>>0,g>>>0)):[],group:_,kernel_shape:C?Array.from(n().subarray(C>>>0,R>>>0)):[],pads:P?Array.from(n().subarray(P>>>0,N>>>0)):[],strides:q?Array.from(n().subarray(q>>>0,Y>>>0)):[],w_is_const:()=>!!r()[pe>>>0],activation:Ce(I),activation_params:ae?Array.from(d().subarray(ae>>>0,ye>>>0)):[]})},881103:o=>{u.jb("Gelu",o,void 0)},881155:(o,h,m,g)=>{u.jb("GroupQueryAttention",o,{numHeads:h,kvNumHeads:m,scale:g})},881268:(o,h,m,g)=>{u.jb("LayerNormalization",o,{axis:h,epsilon:m,simplified:!!g})},881379:(o,h,m,g)=>{u.jb("LayerNormalization",o,{axis:h,epsilon:m,simplified:!!g})},881490:(o,h,m,g,_,C)=>{u.jb("MatMulNBits",o,{k:h,n:m,accuracyLevel:g,bits:_,blockSize:C})},881617:(o,h,m,g,_,C)=>{u.jb("MultiHeadAttention",o,{numHeads:h,isUnidirectional:m,maskFilterValue:g,scale:_,doRotary:C})},881776:(o,h)=>{u.jb("QuickGelu",o,{alpha:h})},881840:(o,h,m,g,_)=>{u.jb("RotaryEmbedding",o,{interleaved:!!h,numHeads:m,rotaryEmbeddingDim:g,scale:_})},881979:(o,h,m)=>{u.jb("SkipLayerNormalization",o,{epsilon:h,simplified:!!m})},882081:(o,h,m)=>{u.jb("SkipLayerNormalization",o,{epsilon:h,simplified:!!m})},882183:(o,h,m,g)=>{u.jb("GatherBlockQuantized",o,{gatherAxis:h,quantizeAxis:m,blockSize:g})},882304:o=>{u.Zb(o)},882338:(o,h)=>u.bc(o,h,u.Eb.fc,u.Eb.errors)};function sc(o,h,m){return In(async()=>{await u.Xb(o,h,m)})}function oc(){return typeof wasmOffsetConverter<"u"}function Lr(o){this.name="ExitStatus",this.message=`Program terminated with exit(${o})`,this.status=o}var jr=o=>{o.terminate(),o.onmessage=()=>{}},Ya=o=>{nt.length==0&&(tn(),en(nt[0]));var h=nt.pop();if(!h)return 6;_t.push(h),Ye[o.Ab]=h,h.Ab=o.Ab;var m={cmd:"run",start_routine:o.hc,arg:o.Qb,pthread_ptr:o.Ab};return h.postMessage(m,o.mc),0},$t=0,ge=(o,h,...m)=>{for(var g=2*m.length,_=li(),C=ui(8*g),R=C>>>3,P=0;P<m.length;P++){var N=m[P];typeof N=="bigint"?(ve[R+2*P]=1n,ve[R+2*P+1]=N):(ve[R+2*P]=0n,p()[R+2*P+1>>>0]=N)}return o=Jn(o,0,g,C,h),fr(_),o};function Gr(o){if(b)return ge(0,1,o);if(j=o,!(0<$t)){for(var h of _t)jr(h);for(h of nt)jr(h);nt=[],_t=[],Ye=[],Oe=!0}T(o,new Lr(o))}function Za(o){if(b)return ge(1,0,o);Fr(o)}var Fr=o=>{if(j=o,b)throw Za(o),"unwind";Gr(o)},nt=[],_t=[],Qa=[],Ye={},Xa=o=>{var h=o.Ab;delete Ye[h],nt.push(o),_t.splice(_t.indexOf(o),1),o.Ab=0,oi(h)};function Ja(){Qa.forEach(o=>o())}var en=o=>new Promise(h=>{o.onmessage=_=>{var C=(_=_.data).cmd;if(_.targetThread&&_.targetThread!=zt()){var R=Ye[_.targetThread];R?R.postMessage(_,_.transferList):H(`Internal error! Worker sent a message "${C}" to target pthread ${_.targetThread}, but that thread no longer exists!`)}else C==="checkMailbox"?ar():C==="spawnThread"?Ya(_):C==="cleanupThread"?Xa(Ye[_.thread]):C==="killThread"?(_=_.thread,C=Ye[_],delete Ye[_],jr(C),oi(_),_t.splice(_t.indexOf(C),1),C.Ab=0):C==="cancelThread"?Ye[_.thread].postMessage({cmd:"cancel"}):C==="loaded"?(o.loaded=!0,h(o)):C==="alert"?alert(`Thread ${_.threadId}: ${_.text}`):_.target==="setimmediate"?o.postMessage(_):C==="callHandler"?u[_.handler](..._.args):C&&H(`worker sent an unknown command ${C}`)},o.onerror=_=>{throw H(`worker sent an error! ${_.filename}:${_.lineno}: ${_.message}`),_};var m,g=[];for(m of[])u.hasOwnProperty(m)&&g.push(m);o.postMessage({cmd:"load",handlers:g,wasmMemory:ie,wasmModule:de})});function tn(){var o=new Worker(new URL(import.meta.url),{type:"module",workerData:"em-pthread",name:"em-pthread"});nt.push(o)}var ir=o=>{for(;0<o.length;)o.shift()(u)},uc=()=>{var o=zt(),h=l()[o+52>>>2>>>0];o=l()[o+56>>>2>>>0],ts(h,h-o),fr(h)},lc=(o,h)=>{$t=0,o=rs(o,h),0<$t?j=o:cr(o)};class dc{constructor(h){this.Jb=h-24}}function pc(o,h,m){var g=new dc(o>>>=0);throw h>>>=0,m>>>=0,l()[g.Jb+16>>>2>>>0]=0,l()[g.Jb+4>>>2>>>0]=h,l()[g.Jb+8>>>2>>>0]=m,o}function rn(o,h,m,g){return b?ge(2,1,o,h,m,g):an(o,h,m,g)}function an(o,h,m,g){if(o>>>=0,h>>>=0,m>>>=0,g>>>=0,x===void 0)return H("Current environment does not support SharedArrayBuffer, pthreads are not available!"),6;var _=[];return b&&_.length===0?rn(o,h,m,g):(o={hc:m,Ab:o,Qb:g,mc:_},b?(o.Mb="spawnThread",postMessage(o,_),0):Ya(o))}var nn=typeof TextDecoder<"u"?new TextDecoder("utf8"):void 0,sn=(o,h,m)=>{var g=(h>>>=0)+m;for(m=h;o[m]&&!(m>=g);)++m;if(16<m-h&&o.buffer&&nn)return nn.decode(o.buffer instanceof x?o.slice(h,m):o.subarray(h,m));for(g="";h<m;){var _=o[h++];if(128&_){var C=63&o[h++];if((224&_)==192)g+=String.fromCharCode((31&_)<<6|C);else{var R=63&o[h++];65536>(_=(240&_)==224?(15&_)<<12|C<<6|R:(7&_)<<18|C<<12|R<<6|63&o[h++])?g+=String.fromCharCode(_):(_-=65536,g+=String.fromCharCode(55296|_>>10,56320|1023&_))}}else g+=String.fromCharCode(_)}return g},Ce=(o,h)=>(o>>>=0)?sn(i(),o,h):"";function on(o,h,m){return b?ge(3,1,o,h,m):0}function un(o,h){if(b)return ge(4,1,o,h)}var Hr=o=>{for(var h=0,m=0;m<o.length;++m){var g=o.charCodeAt(m);127>=g?h++:2047>=g?h+=2:55296<=g&&57343>=g?(h+=4,++m):h+=3}return h},ln=(o,h,m,g)=>{if(!(0<g))return 0;var _=m>>>=0;g=m+g-1;for(var C=0;C<o.length;++C){var R=o.charCodeAt(C);if(55296<=R&&57343>=R&&(R=65536+((1023&R)<<10)|1023&o.charCodeAt(++C)),127>=R){if(m>=g)break;h[m++>>>0]=R}else{if(2047>=R){if(m+1>=g)break;h[m++>>>0]=192|R>>6}else{if(65535>=R){if(m+2>=g)break;h[m++>>>0]=224|R>>12}else{if(m+3>=g)break;h[m++>>>0]=240|R>>18,h[m++>>>0]=128|R>>12&63}h[m++>>>0]=128|R>>6&63}h[m++>>>0]=128|63&R}}return h[m>>>0]=0,m-_},Tt=(o,h,m)=>ln(o,i(),h,m);function dn(o,h){if(b)return ge(5,1,o,h)}function pn(o,h,m){if(b)return ge(6,1,o,h,m)}function hn(o,h,m){return b?ge(7,1,o,h,m):0}function cn(o,h){if(b)return ge(8,1,o,h)}function fn(o,h,m){if(b)return ge(9,1,o,h,m)}function mn(o,h,m,g){if(b)return ge(10,1,o,h,m,g)}function gn(o,h,m,g){if(b)return ge(11,1,o,h,m,g)}function yn(o,h,m,g){if(b)return ge(12,1,o,h,m,g)}function wn(o){if(b)return ge(13,1,o)}function $n(o,h){if(b)return ge(14,1,o,h)}function _n(o,h,m){if(b)return ge(15,1,o,h,m)}var vn,st,hc=()=>{Ct("")},Ze=o=>{for(var h="";i()[o>>>0];)h+=vn[i()[o++>>>0]];return h},Kr={},Yr={};function tt(o,h,m={}){if(!("argPackAdvance"in h))throw new TypeError("registerType registeredInstance requires argPackAdvance");return function(g,_,C={}){var R=_.name;if(!g)throw new st(`type "${R}" must have a positive integer typeid pointer`);if(Yr.hasOwnProperty(g)){if(C.Sb)return;throw new st(`Cannot register type '${R}' twice`)}Yr[g]=_,Kr.hasOwnProperty(g)&&(_=Kr[g],delete Kr[g],_.forEach(P=>P()))}(o,h,m)}var bn=(o,h,m)=>{switch(h){case 1:return m?g=>r()[g>>>0]:g=>i()[g>>>0];case 2:return m?g=>a()[g>>>1>>>0]:g=>s()[g>>>1>>>0];case 4:return m?g=>n()[g>>>2>>>0]:g=>l()[g>>>2>>>0];case 8:return m?g=>ve[g>>>3]:g=>it[g>>>3];default:throw new TypeError(`invalid integer width (${h}): ${o}`)}};function cc(o,h,m){m>>>=0,tt(o>>>=0,{name:h=Ze(h>>>0),fromWireType:g=>g,toWireType:function(g,_){if(typeof _!="bigint"&&typeof _!="number")throw _=_===null?"null":(g=typeof _)=="object"||g==="array"||g==="function"?_.toString():""+_,new TypeError(`Cannot convert "${_}" to ${this.name}`);return typeof _=="number"&&(_=BigInt(_)),_},argPackAdvance:ot,readValueFromPointer:bn(h,m,h.indexOf("u")==-1),Db:null})}var ot=8;function fc(o,h,m,g){tt(o>>>=0,{name:h=Ze(h>>>0),fromWireType:function(_){return!!_},toWireType:function(_,C){return C?m:g},argPackAdvance:ot,readValueFromPointer:function(_){return this.fromWireType(i()[_>>>0])},Db:null})}var Zr=[],rt=[];function Qr(o){9<(o>>>=0)&&--rt[o+1]==0&&(rt[o]=void 0,Zr.push(o))}var Ne=o=>{if(!o)throw new st("Cannot use deleted val. handle = "+o);return rt[o]},We=o=>{switch(o){case void 0:return 2;case null:return 4;case!0:return 6;case!1:return 8;default:let h=Zr.pop()||rt.length;return rt[h]=o,rt[h+1]=1,h}};function Xr(o){return this.fromWireType(l()[o>>>2>>>0])}var mc={name:"emscripten::val",fromWireType:o=>{var h=Ne(o);return Qr(o),h},toWireType:(o,h)=>We(h),argPackAdvance:ot,readValueFromPointer:Xr,Db:null};function gc(o){return tt(o>>>0,mc)}var yc=(o,h)=>{switch(h){case 4:return function(m){return this.fromWireType(d()[m>>>2>>>0])};case 8:return function(m){return this.fromWireType(p()[m>>>3>>>0])};default:throw new TypeError(`invalid float width (${h}): ${o}`)}};function wc(o,h,m){m>>>=0,tt(o>>>=0,{name:h=Ze(h>>>0),fromWireType:g=>g,toWireType:(g,_)=>_,argPackAdvance:ot,readValueFromPointer:yc(h,m),Db:null})}function $c(o,h,m,g,_){if(o>>>=0,m>>>=0,h=Ze(h>>>0),_===-1&&(_=4294967295),_=P=>P,g===0){var C=32-8*m;_=P=>P<<C>>>C}var R=h.includes("unsigned")?function(P,N){return N>>>0}:function(P,N){return N};tt(o,{name:h,fromWireType:_,toWireType:R,argPackAdvance:ot,readValueFromPointer:bn(h,m,g!==0),Db:null})}function _c(o,h,m){function g(C){var R=l()[C>>>2>>>0];return C=l()[C+4>>>2>>>0],new _(r().buffer,C,R)}var _=[Int8Array,Uint8Array,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array,BigInt64Array,BigUint64Array][h];tt(o>>>=0,{name:m=Ze(m>>>0),fromWireType:g,argPackAdvance:ot,readValueFromPointer:g},{Sb:!0})}function vc(o,h){o>>>=0;var m=(h=Ze(h>>>0))==="std::string";tt(o,{name:h,fromWireType:function(g){var _=l()[g>>>2>>>0],C=g+4;if(m)for(var R=C,P=0;P<=_;++P){var N=C+P;if(P==_||i()[N>>>0]==0){if(R=Ce(R,N-R),q===void 0)var q=R;else q+="\0",q+=R;R=N+1}}else{for(q=Array(_),P=0;P<_;++P)q[P]=String.fromCharCode(i()[C+P>>>0]);q=q.join("")}return Xe(g),q},toWireType:function(g,_){_ instanceof ArrayBuffer&&(_=new Uint8Array(_));var C=typeof _=="string";if(!(C||_ instanceof Uint8Array||_ instanceof Uint8ClampedArray||_ instanceof Int8Array))throw new st("Cannot pass non-string to std::string");var R=m&&C?Hr(_):_.length,P=hr(4+R+1),N=P+4;if(l()[P>>>2>>>0]=R,m&&C)Tt(_,N,R+1);else if(C)for(C=0;C<R;++C){var q=_.charCodeAt(C);if(255<q)throw Xe(N),new st("String has UTF-16 code units that do not fit in 8 bits");i()[N+C>>>0]=q}else for(C=0;C<R;++C)i()[N+C>>>0]=_[C];return g!==null&&g.push(Xe,P),P},argPackAdvance:ot,readValueFromPointer:Xr,Db(g){Xe(g)}})}var xn=typeof TextDecoder<"u"?new TextDecoder("utf-16le"):void 0,bc=(o,h)=>{for(var m=o>>1,g=m+h/2;!(m>=g)&&s()[m>>>0];)++m;if(32<(m<<=1)-o&&xn)return xn.decode(i().slice(o,m));for(m="",g=0;!(g>=h/2);++g){var _=a()[o+2*g>>>1>>>0];if(_==0)break;m+=String.fromCharCode(_)}return m},xc=(o,h,m)=>{if(m??(m=2147483647),2>m)return 0;var g=h;m=(m-=2)<2*o.length?m/2:o.length;for(var _=0;_<m;++_){var C=o.charCodeAt(_);a()[h>>>1>>>0]=C,h+=2}return a()[h>>>1>>>0]=0,h-g},Sc=o=>2*o.length,kc=(o,h)=>{for(var m=0,g="";!(m>=h/4);){var _=n()[o+4*m>>>2>>>0];if(_==0)break;++m,65536<=_?(_-=65536,g+=String.fromCharCode(55296|_>>10,56320|1023&_)):g+=String.fromCharCode(_)}return g},Ec=(o,h,m)=>{if(h>>>=0,m??(m=2147483647),4>m)return 0;var g=h;m=g+m-4;for(var _=0;_<o.length;++_){var C=o.charCodeAt(_);if(55296<=C&&57343>=C&&(C=65536+((1023&C)<<10)|1023&o.charCodeAt(++_)),n()[h>>>2>>>0]=C,(h+=4)+4>m)break}return n()[h>>>2>>>0]=0,h-g},Cc=o=>{for(var h=0,m=0;m<o.length;++m){var g=o.charCodeAt(m);55296<=g&&57343>=g&&++m,h+=4}return h};function Tc(o,h,m){if(o>>>=0,h>>>=0,m=Ze(m>>>=0),h===2)var g=bc,_=xc,C=Sc,R=P=>s()[P>>>1>>>0];else h===4&&(g=kc,_=Ec,C=Cc,R=P=>l()[P>>>2>>>0]);tt(o,{name:m,fromWireType:P=>{for(var N,q=l()[P>>>2>>>0],Y=P+4,se=0;se<=q;++se){var pe=P+4+se*h;se!=q&&R(pe)!=0||(Y=g(Y,pe-Y),N===void 0?N=Y:(N+="\0",N+=Y),Y=pe+h)}return Xe(P),N},toWireType:(P,N)=>{if(typeof N!="string")throw new st(`Cannot pass non-string to C++ string type ${m}`);var q=C(N),Y=hr(4+q+h);return l()[Y>>>2>>>0]=q/h,_(N,Y+4,q+h),P!==null&&P.push(Xe,Y),Y},argPackAdvance:ot,readValueFromPointer:Xr,Db(P){Xe(P)}})}function Ic(o,h){tt(o>>>=0,{Tb:!0,name:h=Ze(h>>>0),argPackAdvance:0,fromWireType:()=>{},toWireType:()=>{}})}var zc=()=>1;function Ac(o){si(o>>>0,!$,1,!w,131072,!1),Ja()}var Sn=o=>{if(!Oe)try{if(o(),!(0<$t))try{b?cr(j):Fr(j)}catch(h){h instanceof Lr||h=="unwind"||T(1,h)}}catch(h){h instanceof Lr||h=="unwind"||T(1,h)}};function Jr(o){o>>>=0,typeof Atomics.nc=="function"&&(Atomics.nc(n(),o>>>2,o).value.then(ar),o+=128,Atomics.store(n(),o>>>2,1))}var ar=()=>{var o=zt();o&&(Jr(o),Sn(es))};function Oc(o,h){(o>>>=0)==h>>>0?setTimeout(ar):b?postMessage({targetThread:o,cmd:"checkMailbox"}):(o=Ye[o])&&o.postMessage({cmd:"checkMailbox"})}var ei=[];function Rc(o,h,m,g,_){for(h>>>=0,g/=2,ei.length=g,m=_>>>0>>>3,_=0;_<g;_++)ei[_]=ve[m+2*_]?ve[m+2*_+1]:p()[m+2*_+1>>>0];return(h?Vr[h]:xf[o])(...ei)}function Bc(o){o>>>=0,b?postMessage({cmd:"cleanupThread",thread:o}):Xa(Ye[o])}function Mc(o){}var ti=(o,h)=>{var m=Yr[o];if(m===void 0)throw o=Zn(o),m=Ze(o),Xe(o),new st(`${h} has unknown type ${m}`);return m},kn=(o,h,m)=>{var g=[];return o=o.toWireType(g,m),g.length&&(l()[h>>>2>>>0]=We(g)),o};function Pc(o,h,m){return h>>>=0,m>>>=0,o=Ne(o>>>0),h=ti(h,"emval::as"),kn(h,m,o)}var nr=o=>{try{o()}catch(h){Ct(h)}},ut=0,Qe=null,En=0,sr=[],Cn={},Tn={},Dc=0,ri=null,Uc=[];function In(o){return function(h){if(!Oe){if(ut===0){var m=!1,g=!1;h((_=0)=>{if(!Oe&&(En=_,m=!0,g)){ut=2,nr(()=>ns(Qe)),typeof Browser<"u"&&Browser.Kb.Rb&&Browser.Kb.resume(),_=!1;try{var C=function(){var N=n()[Qe+8>>>2>>>0];return N=K[Tn[N]],--$t,N()}()}catch(N){C=N,_=!0}var R=!1;if(!Qe){var P=ri;P&&(ri=null,(_?P.reject:P.resolve)(C),R=!0)}if(_&&!R)throw C}}),g=!0,m||(ut=1,Qe=function(){var _=hr(65548),C=_+12;l()[_>>>2>>>0]=C,l()[_+4>>>2>>>0]=C+65536,C=sr[0];var R=Cn[C];return R===void 0&&(R=Dc++,Cn[C]=R,Tn[R]=C),C=R,n()[_+8>>>2>>>0]=C,_}(),typeof Browser<"u"&&Browser.Kb.Rb&&Browser.Kb.pause(),nr(()=>is(Qe)))}else ut===2?(ut=0,nr(ss),Xe(Qe),Qe=null,Uc.forEach(Sn)):Ct(`invalid state: ${ut}`);return En}}(h=>{o().then(h)})}function Nc(o){return o>>>=0,In(()=>(o=Ne(o)).then(We))}var or=[];function Wc(o,h,m,g){return m>>>=0,g>>>=0,(o=or[o>>>0])(null,h=Ne(h>>>0),m,g)}var qc={},ur=o=>{var h=qc[o];return h===void 0?Ze(o):h};function Vc(o,h,m,g,_){return m>>>=0,g>>>=0,_>>>=0,(o=or[o>>>0])(h=Ne(h>>>0),h[m=ur(m)],g,_)}var zn=()=>typeof globalThis=="object"?globalThis:Function("return this")();function Lc(o){return(o>>>=0)==0?We(zn()):(o=ur(o),We(zn()[o]))}var jc=o=>{var h=or.length;return or.push(o),h},Gc=(o,h)=>{for(var m=Array(o),g=0;g<o;++g)m[g]=ti(l()[h+4*g>>>2>>>0],"parameter "+g);return m},An=(o,h)=>Object.defineProperty(h,"name",{value:o});function Fc(o,h,m){var g=(h=Gc(o,h>>>0)).shift();o--;var _=`return function (obj, func, destructorsRef, args) {
`,C=0,R=[];m===0&&R.push("obj");for(var P=["retType"],N=[g],q=0;q<o;++q)R.push("arg"+q),P.push("argType"+q),N.push(h[q]),_+=`  var arg${q} = argType${q}.readValueFromPointer(args${C?"+"+C:""});
`,C+=h[q].argPackAdvance;return _+=`  var rv = ${m===1?"new func":"func.call"}(${R.join(", ")});
`,g.Tb||(P.push("emval_returnValue"),N.push(kn),_+=`  return emval_returnValue(retType, destructorsRef, rv);
`),P.push(_+`};
`),o=function(Y){var se=Function;if(!(se instanceof Function))throw new TypeError(`new_ called with constructor type ${typeof se} which is not a function`);var pe=An(se.name||"unknownFunctionName",function(){});return pe.prototype=se.prototype,pe=new pe,(Y=se.apply(pe,Y))instanceof Object?Y:pe}(P)(...N),m=`methodCaller<(${h.map(Y=>Y.name).join(", ")}) => ${g.name}>`,jc(An(m,o))}function Hc(o){return o=ur(o>>>0),We(u[o])}function Kc(o,h){return h>>>=0,o=Ne(o>>>0),h=Ne(h),We(o[h])}function Yc(o){9<(o>>>=0)&&(rt[o+1]+=1)}function Zc(){return We([])}function Qc(o){o=Ne(o>>>0);for(var h=Array(o.length),m=0;m<o.length;m++)h[m]=o[m];return We(h)}function Xc(o){return We(ur(o>>>0))}function Jc(){return We({})}function ef(o){for(var h=Ne(o>>>=0);h.length;){var m=h.pop();h.pop()(m)}Qr(o)}function tf(o,h,m){h>>>=0,m>>>=0,o=Ne(o>>>0),h=Ne(h),m=Ne(m),o[h]=m}function rf(o,h){return h>>>=0,o=(o=ti(o>>>0,"_emval_take_value")).readValueFromPointer(h),We(o)}function af(o,h){o=-9007199254740992>o||9007199254740992<o?NaN:Number(o),h>>>=0,o=new Date(1e3*o),n()[h>>>2>>>0]=o.getUTCSeconds(),n()[h+4>>>2>>>0]=o.getUTCMinutes(),n()[h+8>>>2>>>0]=o.getUTCHours(),n()[h+12>>>2>>>0]=o.getUTCDate(),n()[h+16>>>2>>>0]=o.getUTCMonth(),n()[h+20>>>2>>>0]=o.getUTCFullYear()-1900,n()[h+24>>>2>>>0]=o.getUTCDay(),o=(o.getTime()-Date.UTC(o.getUTCFullYear(),0,1,0,0,0,0))/864e5|0,n()[h+28>>>2>>>0]=o}var It=o=>o%4==0&&(o%100!=0||o%400==0),On=[0,31,60,91,121,152,182,213,244,274,305,335],Rn=[0,31,59,90,120,151,181,212,243,273,304,334];function nf(o,h){o=-9007199254740992>o||9007199254740992<o?NaN:Number(o),h>>>=0,o=new Date(1e3*o),n()[h>>>2>>>0]=o.getSeconds(),n()[h+4>>>2>>>0]=o.getMinutes(),n()[h+8>>>2>>>0]=o.getHours(),n()[h+12>>>2>>>0]=o.getDate(),n()[h+16>>>2>>>0]=o.getMonth(),n()[h+20>>>2>>>0]=o.getFullYear()-1900,n()[h+24>>>2>>>0]=o.getDay();var m=(It(o.getFullYear())?On:Rn)[o.getMonth()]+o.getDate()-1|0;n()[h+28>>>2>>>0]=m,n()[h+36>>>2>>>0]=-60*o.getTimezoneOffset(),m=new Date(o.getFullYear(),6,1).getTimezoneOffset();var g=new Date(o.getFullYear(),0,1).getTimezoneOffset();o=0|(m!=g&&o.getTimezoneOffset()==Math.min(g,m)),n()[h+32>>>2>>>0]=o}function sf(o){o>>>=0;var h=new Date(n()[o+20>>>2>>>0]+1900,n()[o+16>>>2>>>0],n()[o+12>>>2>>>0],n()[o+8>>>2>>>0],n()[o+4>>>2>>>0],n()[o>>>2>>>0],0),m=n()[o+32>>>2>>>0],g=h.getTimezoneOffset(),_=new Date(h.getFullYear(),6,1).getTimezoneOffset(),C=new Date(h.getFullYear(),0,1).getTimezoneOffset(),R=Math.min(C,_);return 0>m?n()[o+32>>>2>>>0]=+(_!=C&&R==g):0<m!=(R==g)&&(_=Math.max(C,_),h.setTime(h.getTime()+6e4*((0<m?R:_)-g))),n()[o+24>>>2>>>0]=h.getDay(),m=(It(h.getFullYear())?On:Rn)[h.getMonth()]+h.getDate()-1|0,n()[o+28>>>2>>>0]=m,n()[o>>>2>>>0]=h.getSeconds(),n()[o+4>>>2>>>0]=h.getMinutes(),n()[o+8>>>2>>>0]=h.getHours(),n()[o+12>>>2>>>0]=h.getDate(),n()[o+16>>>2>>>0]=h.getMonth(),n()[o+20>>>2>>>0]=h.getYear(),o=h.getTime(),BigInt(isNaN(o)?-1:o/1e3)}function Bn(o,h,m,g,_,C,R){return b?ge(16,1,o,h,m,g,_,C,R):-52}function Mn(o,h,m,g,_,C){if(b)return ge(17,1,o,h,m,g,_,C)}function of(o,h,m,g){o>>>=0,h>>>=0,m>>>=0,g>>>=0;var _=new Date().getFullYear(),C=new Date(_,0,1),R=new Date(_,6,1);_=C.getTimezoneOffset();var P=R.getTimezoneOffset(),N=Math.max(_,P);l()[o>>>2>>>0]=60*N,n()[h>>>2>>>0]=+(_!=P),C=(o=q=>q.toLocaleTimeString(void 0,{hour12:!1,timeZoneName:"short"}).split(" ")[1])(C),R=o(R),P<_?(Tt(C,m,17),Tt(R,g,17)):(Tt(C,g,17),Tt(R,m,17))}var ii=[],Pn=(o,h)=>{ii.length=0;for(var m;m=i()[o++>>>0];){var g=m!=105;h+=(g&=m!=112)&&h%8?4:0,ii.push(m==112?l()[h>>>2>>>0]:m==106?ve[h>>>3]:m==105?n()[h>>>2>>>0]:p()[h>>>3>>>0]),h+=g?8:4}return ii};function uf(o,h,m){return o>>>=0,h=Pn(h>>>0,m>>>0),Vr[o](...h)}function lf(o,h,m){return o>>>=0,h=Pn(h>>>0,m>>>0),Vr[o](...h)}var df=()=>{},pf=()=>Date.now();function hf(o,h){return H(Ce(o>>>0,h>>>0))}var Dn,cf=()=>{throw $t+=1,"unwind"};function ff(){return 4294901760}Dn=()=>performance.timeOrigin+performance.now();var mf=()=>navigator.hardwareConcurrency;function gf(){return Ct("Cannot use emscripten_pc_get_function without -sUSE_OFFSET_CONVERTER"),0}function yf(o){o>>>=0;var h=i().length;if(o<=h||4294901760<o)return!1;for(var m=1;4>=m;m*=2){var g=h*(1+.2/m);g=Math.min(g,o+100663296);var _=Math;g=Math.max(o,g);e:{_=(_.min.call(_,4294901760,g+(65536-g%65536)%65536)-ie.buffer.byteLength+65535)/65536;try{ie.grow(_),ke();var C=1;break e}catch{}C=void 0}if(C)return!0}return!1}var lr=()=>(Ct("Cannot use convertFrameToPC (needed by __builtin_return_address) without -sUSE_OFFSET_CONVERTER"),0),Ut={},Un=o=>{o.forEach(h=>{lr()})};function wf(){var o=Error().stack.toString().split(`
`);return o[0]=="Error"&&o.shift(),Un(o),Ut.Pb=lr(),Ut.ec=o,Ut.Pb}function $f(o,h,m){if(o>>>=0,h>>>=0,Ut.Pb==o)var g=Ut.ec;else(g=Error().stack.toString().split(`
`))[0]=="Error"&&g.shift(),Un(g);for(var _=3;g[_]&&lr()!=o;)++_;for(o=0;o<m&&g[o+_];++o)n()[h+4*o>>>2>>>0]=lr();return o}var ai,ni={},Nn=()=>{if(!ai){var o,h={USER:"web_user",LOGNAME:"web_user",PATH:"/",PWD:"/",HOME:"/home/web_user",LANG:(typeof navigator=="object"&&navigator.languages&&navigator.languages[0]||"C").replace("-","_")+".UTF-8",_:z};for(o in ni)ni[o]===void 0?delete h[o]:h[o]=ni[o];var m=[];for(o in h)m.push(`${o}=${h[o]}`);ai=m}return ai};function Wn(o,h){if(b)return ge(18,1,o,h);o>>>=0,h>>>=0;var m=0;return Nn().forEach((g,_)=>{var C=h+m;for(_=l()[o+4*_>>>2>>>0]=C,C=0;C<g.length;++C)r()[_++>>>0]=g.charCodeAt(C);r()[_>>>0]=0,m+=g.length+1}),0}function qn(o,h){if(b)return ge(19,1,o,h);o>>>=0,h>>>=0;var m=Nn();l()[o>>>2>>>0]=m.length;var g=0;return m.forEach(_=>g+=_.length+1),l()[h>>>2>>>0]=g,0}function Vn(o){return b?ge(20,1,o):52}function Ln(o,h,m,g){return b?ge(21,1,o,h,m,g):52}function jn(o,h,m,g){return b?ge(22,1,o,h,m,g):70}var _f=[null,[],[]];function Gn(o,h,m,g){if(b)return ge(23,1,o,h,m,g);h>>>=0,m>>>=0,g>>>=0;for(var _=0,C=0;C<m;C++){var R=l()[h>>>2>>>0],P=l()[h+4>>>2>>>0];h+=8;for(var N=0;N<P;N++){var q=i()[R+N>>>0],Y=_f[o];q===0||q===10?((o===1?ee:H)(sn(Y,0)),Y.length=0):Y.push(q)}_+=P}return l()[g>>>2>>>0]=_,0}var Fn=[31,29,31,30,31,30,31,31,30,31,30,31],Hn=[31,28,31,30,31,30,31,31,30,31,30,31],vf=(o,h)=>{r().set(o,h>>>0)};function Kn(o,h,m,g){function _(I,ae,ye){for(I=typeof I=="number"?I.toString():I||"";I.length<ae;)I=ye[0]+I;return I}function C(I,ae){return _(I,ae,"0")}function R(I,ae){function ye(us){return 0>us?-1:0<us?1:0}var vt;return(vt=ye(I.getFullYear()-ae.getFullYear()))===0&&(vt=ye(I.getMonth()-ae.getMonth()))===0&&(vt=ye(I.getDate()-ae.getDate())),vt}function P(I){switch(I.getDay()){case 0:return new Date(I.getFullYear()-1,11,29);case 1:return I;case 2:return new Date(I.getFullYear(),0,3);case 3:return new Date(I.getFullYear(),0,2);case 4:return new Date(I.getFullYear(),0,1);case 5:return new Date(I.getFullYear()-1,11,31);case 6:return new Date(I.getFullYear()-1,11,30)}}function N(I){var ae=I.Bb;for(I=new Date(new Date(I.Cb+1900,0,1).getTime());0<ae;){var ye=I.getMonth(),vt=(It(I.getFullYear())?Fn:Hn)[ye];if(!(ae>vt-I.getDate())){I.setDate(I.getDate()+ae);break}ae-=vt-I.getDate()+1,I.setDate(1),11>ye?I.setMonth(ye+1):(I.setMonth(0),I.setFullYear(I.getFullYear()+1))}return ye=new Date(I.getFullYear()+1,0,4),ae=P(new Date(I.getFullYear(),0,4)),ye=P(ye),0>=R(ae,I)?0>=R(ye,I)?I.getFullYear()+1:I.getFullYear():I.getFullYear()-1}o>>>=0,h>>>=0,m>>>=0,g>>>=0;var q=l()[g+40>>>2>>>0];for(var Y in g={kc:n()[g>>>2>>>0],jc:n()[g+4>>>2>>>0],Hb:n()[g+8>>>2>>>0],Lb:n()[g+12>>>2>>>0],Ib:n()[g+16>>>2>>>0],Cb:n()[g+20>>>2>>>0],ub:n()[g+24>>>2>>>0],Bb:n()[g+28>>>2>>>0],rc:n()[g+32>>>2>>>0],ic:n()[g+36>>>2>>>0],lc:q?Ce(q):""},m=Ce(m),q={"%c":"%a %b %d %H:%M:%S %Y","%D":"%m/%d/%y","%F":"%Y-%m-%d","%h":"%b","%r":"%I:%M:%S %p","%R":"%H:%M","%T":"%H:%M:%S","%x":"%m/%d/%y","%X":"%H:%M:%S","%Ec":"%c","%EC":"%C","%Ex":"%m/%d/%y","%EX":"%H:%M:%S","%Ey":"%y","%EY":"%Y","%Od":"%d","%Oe":"%e","%OH":"%H","%OI":"%I","%Om":"%m","%OM":"%M","%OS":"%S","%Ou":"%u","%OU":"%U","%OV":"%V","%Ow":"%w","%OW":"%W","%Oy":"%y"})m=m.replace(new RegExp(Y,"g"),q[Y]);var se="Sunday Monday Tuesday Wednesday Thursday Friday Saturday".split(" "),pe="January February March April May June July August September October November December".split(" ");for(Y in q={"%a":I=>se[I.ub].substring(0,3),"%A":I=>se[I.ub],"%b":I=>pe[I.Ib].substring(0,3),"%B":I=>pe[I.Ib],"%C":I=>C((I.Cb+1900)/100|0,2),"%d":I=>C(I.Lb,2),"%e":I=>_(I.Lb,2," "),"%g":I=>N(I).toString().substring(2),"%G":N,"%H":I=>C(I.Hb,2),"%I":I=>((I=I.Hb)==0?I=12:12<I&&(I-=12),C(I,2)),"%j":I=>{for(var ae=0,ye=0;ye<=I.Ib-1;ae+=(It(I.Cb+1900)?Fn:Hn)[ye++]);return C(I.Lb+ae,3)},"%m":I=>C(I.Ib+1,2),"%M":I=>C(I.jc,2),"%n":()=>`
`,"%p":I=>0<=I.Hb&&12>I.Hb?"AM":"PM","%S":I=>C(I.kc,2),"%t":()=>"	","%u":I=>I.ub||7,"%U":I=>C(Math.floor((I.Bb+7-I.ub)/7),2),"%V":I=>{var ae=Math.floor((I.Bb+7-(I.ub+6)%7)/7);if(2>=(I.ub+371-I.Bb-2)%7&&ae++,ae)ae==53&&((ye=(I.ub+371-I.Bb)%7)==4||ye==3&&It(I.Cb)||(ae=1));else{ae=52;var ye=(I.ub+7-I.Bb-1)%7;(ye==4||ye==5&&It(I.Cb%400-1))&&ae++}return C(ae,2)},"%w":I=>I.ub,"%W":I=>C(Math.floor((I.Bb+7-(I.ub+6)%7)/7),2),"%y":I=>(I.Cb+1900).toString().substring(2),"%Y":I=>I.Cb+1900,"%z":I=>{var ae=0<=(I=I.ic);return I=Math.abs(I)/60,(ae?"+":"-")+("0000"+(I/60*100+I%60)).slice(-4)},"%Z":I=>I.lc,"%%":()=>"%"},m=m.replace(/%%/g,"\0\0"),q)m.includes(Y)&&(m=m.replace(new RegExp(Y,"g"),q[Y](g)));return Y=function(I){var ae=Array(Hr(I)+1);return ln(I,ae,0,ae.length),ae}(m=m.replace(/\0\0/g,"%")),Y.length>h?0:(vf(Y,o),Y.length-1)}function bf(o,h,m,g){return Kn(o>>>0,h>>>0,m>>>0,g>>>0)}b||function(){for(var o=u.numThreads-1;o--;)tn();wt.unshift(()=>{Ue++,function(h){b?h():Promise.all(nt.map(en)).then(h)}(()=>rr())})}();for(var Yn=Array(256),dr=0;256>dr;++dr)Yn[dr]=String.fromCharCode(dr);vn=Yn,st=u.BindingError=class extends Error{constructor(o){super(o),this.name="BindingError"}},u.InternalError=class extends Error{constructor(o){super(o),this.name="InternalError"}},rt.push(0,1,void 0,1,null,1,!0,1,!1,1),u.count_emval_handles=()=>rt.length/2-5-Zr.length;var xf=[Gr,Za,rn,on,un,dn,pn,hn,cn,fn,mn,gn,yn,wn,$n,_n,Bn,Mn,Wn,qn,Vn,Ln,jn,Gn],K=function(){function o(m,g){return K=m.exports,K=function(){var _=K,C={};for(let[R,P]of Object.entries(_))C[R]=typeof P=="function"?(...N)=>{sr.push(R);try{return P(...N)}finally{Oe||(sr.pop(),Qe&&ut===1&&sr.length===0&&(ut=0,$t+=1,nr(as),typeof Fibers<"u"&&Fibers.sc()))}}:P;return C}(),K=function(){var _=K,C=P=>N=>P(N)>>>0,R=P=>()=>P()>>>0;return(_=Object.assign({},_)).Ca=C(_.Ca),_.fb=R(_.fb),_.gb=C(_.gb),_.emscripten_main_runtime_thread_id=R(_.emscripten_main_runtime_thread_id),_.sb=C(_.sb),_.tb=R(_.tb),_}(),Qa.push(K.ib),xe.unshift(K.Ba),de=g,rr(),K}var h=Ka();if(Ue++,u.instantiateWasm)try{return u.instantiateWasm(h,o)}catch(m){H(`Module.instantiateWasm callback failed with error: ${m}`),c(m)}return qr||(qr=u.locateFile?ja("ort-wasm-simd-threaded.jsep.wasm")?"ort-wasm-simd-threaded.jsep.wasm":u.locateFile?u.locateFile("ort-wasm-simd-threaded.jsep.wasm",M):M+"ort-wasm-simd-threaded.jsep.wasm":new URL(""+new URL("ort-wasm-simd-threaded.jsep-Bj7LIWiD.wasm",import.meta.url).href,import.meta.url).href),function(m,g){var _=qr;return W||typeof WebAssembly.instantiateStreaming!="function"||ja(_)||Ga(_)||typeof fetch!="function"?Ha(_,m,g):fetch(_,{credentials:"same-origin"}).then(C=>WebAssembly.instantiateStreaming(C,m).then(g,function(R){return H(`wasm streaming compile failed: ${R}`),H("falling back to ArrayBuffer instantiation"),Ha(_,m,g)}))}(h,function(m){o(m.instance,m.module)}).catch(c),{}}(),Zn=o=>(Zn=K.Ca)(o),Qn=()=>(Qn=K.Da)();u._OrtInit=(o,h)=>(u._OrtInit=K.Ea)(o,h),u._OrtGetLastError=(o,h)=>(u._OrtGetLastError=K.Fa)(o,h),u._OrtCreateSessionOptions=(o,h,m,g,_,C,R,P,N,q)=>(u._OrtCreateSessionOptions=K.Ga)(o,h,m,g,_,C,R,P,N,q),u._OrtAppendExecutionProvider=(o,h)=>(u._OrtAppendExecutionProvider=K.Ha)(o,h),u._OrtAddFreeDimensionOverride=(o,h,m)=>(u._OrtAddFreeDimensionOverride=K.Ia)(o,h,m),u._OrtAddSessionConfigEntry=(o,h,m)=>(u._OrtAddSessionConfigEntry=K.Ja)(o,h,m),u._OrtReleaseSessionOptions=o=>(u._OrtReleaseSessionOptions=K.Ka)(o),u._OrtCreateSession=(o,h,m)=>(u._OrtCreateSession=K.La)(o,h,m),u._OrtReleaseSession=o=>(u._OrtReleaseSession=K.Ma)(o),u._OrtGetInputOutputCount=(o,h,m)=>(u._OrtGetInputOutputCount=K.Na)(o,h,m),u._OrtGetInputName=(o,h)=>(u._OrtGetInputName=K.Oa)(o,h),u._OrtGetOutputName=(o,h)=>(u._OrtGetOutputName=K.Pa)(o,h),u._OrtFree=o=>(u._OrtFree=K.Qa)(o),u._OrtCreateTensor=(o,h,m,g,_,C)=>(u._OrtCreateTensor=K.Ra)(o,h,m,g,_,C),u._OrtGetTensorData=(o,h,m,g,_)=>(u._OrtGetTensorData=K.Sa)(o,h,m,g,_),u._OrtReleaseTensor=o=>(u._OrtReleaseTensor=K.Ta)(o),u._OrtCreateRunOptions=(o,h,m,g)=>(u._OrtCreateRunOptions=K.Ua)(o,h,m,g),u._OrtAddRunConfigEntry=(o,h,m)=>(u._OrtAddRunConfigEntry=K.Va)(o,h,m),u._OrtReleaseRunOptions=o=>(u._OrtReleaseRunOptions=K.Wa)(o),u._OrtCreateBinding=o=>(u._OrtCreateBinding=K.Xa)(o),u._OrtBindInput=(o,h,m)=>(u._OrtBindInput=K.Ya)(o,h,m),u._OrtBindOutput=(o,h,m,g)=>(u._OrtBindOutput=K.Za)(o,h,m,g),u._OrtClearBoundOutputs=o=>(u._OrtClearBoundOutputs=K._a)(o),u._OrtReleaseBinding=o=>(u._OrtReleaseBinding=K.$a)(o),u._OrtRunWithBinding=(o,h,m,g,_)=>(u._OrtRunWithBinding=K.ab)(o,h,m,g,_),u._OrtRun=(o,h,m,g,_,C,R,P)=>(u._OrtRun=K.bb)(o,h,m,g,_,C,R,P),u._OrtEndProfiling=o=>(u._OrtEndProfiling=K.cb)(o),u._JsepOutput=(o,h,m)=>(u._JsepOutput=K.db)(o,h,m),u._JsepGetNodeName=o=>(u._JsepGetNodeName=K.eb)(o);var pr,zt=()=>(zt=K.fb)(),hr=u._malloc=o=>(hr=u._malloc=K.gb)(o),Xe=u._free=o=>(Xe=u._free=K.hb)(o),si=(o,h,m,g,_,C)=>(si=K.kb)(o,h,m,g,_,C),Xn=()=>(Xn=K.lb)(),Jn=(o,h,m,g,_)=>(Jn=K.mb)(o,h,m,g,_),oi=o=>(oi=K.nb)(o),cr=o=>(cr=K.ob)(o),es=()=>(es=K.pb)(),ts=(o,h)=>(ts=K.qb)(o,h),fr=o=>(fr=K.rb)(o),ui=o=>(ui=K.sb)(o),li=()=>(li=K.tb)(),rs=u.dynCall_ii=(o,h)=>(rs=u.dynCall_ii=K.vb)(o,h),is=o=>(is=K.wb)(o),as=()=>(as=K.xb)(),ns=o=>(ns=K.yb)(o),ss=()=>(ss=K.zb)();function os(){0<Ue||(b?(f(u),b||ir(xe),startWorker(u)):(ir(wt),0<Ue||pr||(pr=!0,u.calledRun=!0,Oe||(b||ir(xe),f(u),b||ir(Te)))))}return u.___start_em_js=882450,u.___stop_em_js=882672,u.stackSave=()=>li(),u.stackRestore=o=>fr(o),u.stackAlloc=o=>ui(o),u.UTF8ToString=Ce,u.stringToUTF8=Tt,u.lengthBytesUTF8=Hr,at=function o(){pr||os(),pr||(at=o)},os(),y}),ed=gi,((e=globalThis.self)==null?void 0:e.name)==="em-pthread"&&gi()}),Ot,ps,hs,cs,yi,td,fs,rd,Ur=D(()=>{var e,t;$a(),Ot=import.meta.url??(typeof document<"u"?(e=document.currentScript)==null?void 0:e.src:typeof self<"u"?(t=self.location)==null?void 0:t.href:void 0),ps=typeof location>"u"?void 0:location.origin,hs=(r,i)=>{try{let a=i??Ot;return(a?new URL(r,a):new URL(r)).origin===ps}catch{return!1}},cs=async r=>{let i=await(await fetch(r,{credentials:"same-origin"})).blob();return URL.createObjectURL(i)},yi=(jf(),Ir(Ql)).default,td=async()=>{if(!Ot)throw new Error("Failed to load proxy worker: cannot determine the script source URL.");if(hs(Ot))return[void 0,yi()];let r=await cs(Ot);return[r,yi(r)]},fs=(Gf(),Ir(Jl)).default,rd=async(r,i,a)=>[void 0,fs]}),wi,gr,Wt,$i,ms,gs,_a,Ee,Et=D(()=>{Ur(),gr=!1,Wt=!1,$i=!1,ms=()=>{if(typeof SharedArrayBuffer>"u")return!1;try{return typeof MessageChannel<"u"&&new MessageChannel().port1.postMessage(new SharedArrayBuffer(1)),WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,5,4,1,3,1,1,10,11,1,9,0,65,0,254,16,2,0,26,11]))}catch{return!1}},gs=()=>{try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,30,1,28,0,65,0,253,15,253,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,253,186,1,26,11]))}catch{return!1}},_a=async e=>{if(gr)return Promise.resolve();if(Wt)throw new Error("multiple calls to 'initializeWebAssembly()' detected.");if($i)throw new Error("previous call to 'initializeWebAssembly()' failed.");Wt=!0;let t=e.initTimeout,r=e.numThreads;if(!gs())throw new Error("WebAssembly SIMD is not supported in the current environment.");let i=ms();r>1&&!i&&(typeof self<"u"&&!self.crossOriginIsolated&&console.warn("env.wasm.numThreads is set to "+r+", but this will not work unless you enable crossOriginIsolated mode. See https://web.dev/cross-origin-isolation-guide/ for more info."),console.warn("WebAssembly multi-threading is not supported in the current environment. Falling back to single-threading."),e.numThreads=r=1);let a=e.wasmPaths,s=typeof a=="string"?a:void 0,n=a==null?void 0:a.mjs,l=(n==null?void 0:n.href)??n,d=a==null?void 0:a.wasm,p=(d==null?void 0:d.href)??d,f=e.wasmBinary,[c,u]=await rd(l,s,r>1),y=!1,w=[];if(t>0&&w.push(new Promise($=>{setTimeout(()=>{y=!0,$()},t)})),w.push(new Promise(($,b)=>{let x={numThreads:r};f?x.wasmBinary=f:(p||s)&&(x.locateFile=(v,k)=>p??(s??k)+v),u(x).then(v=>{Wt=!1,gr=!0,wi=v,$(),c&&URL.revokeObjectURL(c)},v=>{Wt=!1,$i=!0,b(v)})})),await Promise.race(w),y)throw new Error(`WebAssembly backend initializing failed due to timeout: ${t}ms`)},Ee=()=>{if(gr&&wi)return wi;throw new Error("WebAssembly is not initialized yet.")}}),Ie,Ar,we,va=D(()=>{Et(),Ie=(e,t)=>{let r=Ee(),i=r.lengthBytesUTF8(e)+1,a=r._malloc(i);return r.stringToUTF8(e,a,i),t.push(a),a},Ar=(e,t,r,i)=>{if(typeof e=="object"&&e!==null){if(r.has(e))throw new Error("Circular reference in options");r.add(e)}Object.entries(e).forEach(([a,s])=>{let n=t?t+a:a;if(typeof s=="object")Ar(s,n+".",r,i);else if(typeof s=="string"||typeof s=="number")i(n,s.toString());else if(typeof s=="boolean")i(n,s?"1":"0");else throw new Error(`Can't handle extra config type: ${typeof s}`)})},we=e=>{let t=Ee(),r=t.stackSave();try{let i=t.stackAlloc(8);t._OrtGetLastError(i,i+4);let a=t.HEAP32[i/4],s=t.HEAPU32[i/4+1],n=s?t.UTF8ToString(s):"";throw new Error(`${e} ERROR_CODE: ${a}, ERROR_MESSAGE: ${n}`)}finally{t.stackRestore(r)}}}),id,Ff=D(()=>{Et(),va(),id=e=>{let t=Ee(),r=0,i=[],a=e||{};try{if((e==null?void 0:e.logSeverityLevel)===void 0)a.logSeverityLevel=2;else if(typeof e.logSeverityLevel!="number"||!Number.isInteger(e.logSeverityLevel)||e.logSeverityLevel<0||e.logSeverityLevel>4)throw new Error(`log serverity level is not valid: ${e.logSeverityLevel}`);if((e==null?void 0:e.logVerbosityLevel)===void 0)a.logVerbosityLevel=0;else if(typeof e.logVerbosityLevel!="number"||!Number.isInteger(e.logVerbosityLevel))throw new Error(`log verbosity level is not valid: ${e.logVerbosityLevel}`);(e==null?void 0:e.terminate)===void 0&&(a.terminate=!1);let s=0;return(e==null?void 0:e.tag)!==void 0&&(s=Ie(e.tag,i)),r=t._OrtCreateRunOptions(a.logSeverityLevel,a.logVerbosityLevel,!!a.terminate,s),r===0&&we("Can't create run options."),(e==null?void 0:e.extra)!==void 0&&Ar(e.extra,"",new WeakSet,(n,l)=>{let d=Ie(n,i),p=Ie(l,i);t._OrtAddRunConfigEntry(r,d,p)!==0&&we(`Can't set a run config entry: ${n} - ${l}.`)}),[r,i]}catch(s){throw r!==0&&t._OrtReleaseRunOptions(r),i.forEach(n=>t._free(n)),s}}}),ys,ws,$s,_s,ad,Hf=D(()=>{Et(),va(),ys=e=>{switch(e){case"disabled":return 0;case"basic":return 1;case"extended":return 2;case"all":return 99;default:throw new Error(`unsupported graph optimization level: ${e}`)}},ws=e=>{switch(e){case"sequential":return 0;case"parallel":return 1;default:throw new Error(`unsupported execution mode: ${e}`)}},$s=e=>{e.extra||(e.extra={}),e.extra.session||(e.extra.session={});let t=e.extra.session;t.use_ort_model_bytes_directly||(t.use_ort_model_bytes_directly="1"),e.executionProviders&&e.executionProviders.some(r=>(typeof r=="string"?r:r.name)==="webgpu")&&(e.enableMemPattern=!1)},_s=(e,t,r)=>{for(let i of t){let a=typeof i=="string"?i:i.name;switch(a){case"webnn":if(a="WEBNN",typeof i!="string"){let n=i==null?void 0:i.deviceType;if(n){let l=Ie("deviceType",r),d=Ie(n,r);Ee()._OrtAddSessionConfigEntry(e,l,d)!==0&&we(`Can't set a session config entry: 'deviceType' - ${n}.`)}}break;case"webgpu":if(a="JS",typeof i!="string"){let n=i;if(n!=null&&n.preferredLayout){if(n.preferredLayout!=="NCHW"&&n.preferredLayout!=="NHWC")throw new Error(`preferredLayout must be either 'NCHW' or 'NHWC': ${n.preferredLayout}`);let l=Ie("preferredLayout",r),d=Ie(n.preferredLayout,r);Ee()._OrtAddSessionConfigEntry(e,l,d)!==0&&we(`Can't set a session config entry: 'preferredLayout' - ${n.preferredLayout}.`)}}break;case"wasm":case"cpu":continue;default:throw new Error(`not supported execution provider: ${a}`)}let s=Ie(a,r);Ee()._OrtAppendExecutionProvider(e,s)!==0&&we(`Can't append execution provider: ${a}.`)}},ad=e=>{let t=Ee(),r=0,i=[],a=e||{};$s(a);try{let s=ys(a.graphOptimizationLevel??"all"),n=ws(a.executionMode??"sequential"),l=typeof a.logId=="string"?Ie(a.logId,i):0,d=a.logSeverityLevel??2;if(!Number.isInteger(d)||d<0||d>4)throw new Error(`log serverity level is not valid: ${d}`);let p=a.logVerbosityLevel??0;if(!Number.isInteger(p)||p<0||p>4)throw new Error(`log verbosity level is not valid: ${p}`);let f=typeof a.optimizedModelFilePath=="string"?Ie(a.optimizedModelFilePath,i):0;if(r=t._OrtCreateSessionOptions(s,!!a.enableCpuMemArena,!!a.enableMemPattern,n,!!a.enableProfiling,0,l,d,p,f),r===0&&we("Can't create session options."),a.executionProviders&&_s(r,a.executionProviders,i),a.enableGraphCapture!==void 0){if(typeof a.enableGraphCapture!="boolean")throw new Error(`enableGraphCapture must be a boolean value: ${a.enableGraphCapture}`);let c=Ie("enableGraphCapture",i),u=Ie(a.enableGraphCapture.toString(),i);t._OrtAddSessionConfigEntry(r,c,u)!==0&&we(`Can't set a session config entry: 'enableGraphCapture' - ${a.enableGraphCapture}.`)}if(a.freeDimensionOverrides)for(let[c,u]of Object.entries(a.freeDimensionOverrides)){if(typeof c!="string")throw new Error(`free dimension override name must be a string: ${c}`);if(typeof u!="number"||!Number.isInteger(u)||u<0)throw new Error(`free dimension override value must be a non-negative integer: ${u}`);let y=Ie(c,i);t._OrtAddFreeDimensionOverride(r,y,u)!==0&&we(`Can't set a free dimension override: ${c} - ${u}.`)}return a.extra!==void 0&&Ar(a.extra,"",new WeakSet,(c,u)=>{let y=Ie(c,i),w=Ie(u,i);t._OrtAddSessionConfigEntry(r,y,w)!==0&&we(`Can't set a session config entry: ${c} - ${u}.`)}),[r,i]}catch(s){throw r!==0&&t._OrtReleaseSessionOptions(r),i.forEach(n=>t._free(n)),s}}}),Kt,kt,Bt,ba,Or,xa,Sa,ea,X=D(()=>{Kt=e=>{switch(e){case"int8":return 3;case"uint8":return 2;case"bool":return 9;case"int16":return 5;case"uint16":return 4;case"int32":return 6;case"uint32":return 12;case"float16":return 10;case"float32":return 1;case"float64":return 11;case"string":return 8;case"int64":return 7;case"uint64":return 13;case"int4":return 22;case"uint4":return 21;default:throw new Error(`unsupported data type: ${e}`)}},kt=e=>{switch(e){case 3:return"int8";case 2:return"uint8";case 9:return"bool";case 5:return"int16";case 4:return"uint16";case 6:return"int32";case 12:return"uint32";case 10:return"float16";case 1:return"float32";case 11:return"float64";case 8:return"string";case 7:return"int64";case 13:return"uint64";case 22:return"int4";case 21:return"uint4";default:throw new Error(`unsupported data type: ${e}`)}},Bt=(e,t)=>{let r=[-1,4,1,1,2,2,4,8,-1,1,2,8,4,8,-1,-1,-1,-1,-1,-1,-1,.5,.5][e],i=typeof t=="number"?t:t.reduce((a,s)=>a*s,1);return r>0?Math.ceil(i*r):void 0},ba=e=>{switch(e){case"float16":return typeof Float16Array<"u"&&Float16Array.from?Float16Array:Uint16Array;case"float32":return Float32Array;case"uint8":return Uint8Array;case"int8":return Int8Array;case"uint16":return Uint16Array;case"int16":return Int16Array;case"int32":return Int32Array;case"bool":return Uint8Array;case"float64":return Float64Array;case"uint32":return Uint32Array;case"int64":return BigInt64Array;case"uint64":return BigUint64Array;default:throw new Error(`unsupported type: ${e}`)}},Or=e=>{switch(e){case"verbose":return 0;case"info":return 1;case"warning":return 2;case"error":return 3;case"fatal":return 4;default:throw new Error(`unsupported logging level: ${e}`)}},xa=e=>e==="float32"||e==="float16"||e==="int32"||e==="int64"||e==="uint32"||e==="uint8"||e==="bool"||e==="uint4"||e==="int4",Sa=e=>e==="float32"||e==="float16"||e==="int32"||e==="int64"||e==="uint32"||e==="uint64"||e==="int8"||e==="uint8"||e==="bool",ea=e=>{switch(e){case"none":return 0;case"cpu":return 1;case"cpu-pinned":return 2;case"texture":return 3;case"gpu-buffer":return 4;case"ml-tensor":return 5;default:throw new Error(`unsupported data location: ${e}`)}}}),ka,nd=D(()=>{$a(),ka=async e=>{if(typeof e=="string"){let t=await fetch(e);if(!t.ok)throw new Error(`failed to load external data file: ${e}`);let r=t.headers.get("Content-Length"),i=r?parseInt(r,10):0;if(i<1073741824)return new Uint8Array(await t.arrayBuffer());{if(!t.body)throw new Error(`failed to load external data file: ${e}, no response body.`);let a=t.body.getReader(),s;try{s=new ArrayBuffer(i)}catch(l){if(l instanceof RangeError){let d=Math.ceil(i/65536);s=new WebAssembly.Memory({initial:d,maximum:d}).buffer}else throw l}let n=0;for(;;){let{done:l,value:d}=await a.read();if(l)break;let p=d.byteLength;new Uint8Array(s,n,p).set(d),n+=p}return new Uint8Array(s,0,i)}}else return e instanceof Blob?new Uint8Array(await e.arrayBuffer()):e instanceof Uint8Array?e:new Uint8Array(e)}}),vs,bs,xs,Ss,Ea,ks,ce,et=D(()=>{X(),vs=["V","I","W","E","F"],bs=(e,t)=>{console.log(`[${vs[e]},${new Date().toISOString()}]${t}`)},Ea=(e,t)=>{xs=e,Ss=t},ks=(e,t)=>{let r=Or(e),i=Or(xs);r>=i&&bs(r,typeof t=="function"?t():t)},ce=(...e)=>{Ss&&ks(...e)}}),Ca,sd=D(()=>{X(),Ca=(e,t)=>new(ba(t))(e)}),Ta=D(()=>{}),_i,yr,wr,Es,Cs,vi,ta,Ts,od,Kf=D(()=>{et(),Ta(),_i=new Map([[64,250],[128,200],[256,200],[512,200],[2048,230],[4096,200],[8192,50],[16384,50],[32768,50],[65536,50],[131072,50],[262144,50],[524288,50],[1048576,50],[2097152,30],[4194304,20],[8388608,10],[12582912,10],[16777216,10],[26214400,15],[33554432,22],[44236800,2],[58982400,6],[67108864,6],[134217728,6],[167772160,6]]),yr=[],wr=e=>Math.ceil(e/16)*16,Es=e=>{for(let t=0;t<yr.length;t++){let r=yr[t];if(e<=r)return r}return Math.ceil(e/16)*16},Cs=1,vi=()=>Cs++,ta=async(e,t,r,i)=>{let a=wr(r),s=e.device.createBuffer({size:a,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});try{let n=e.getCommandEncoder();e.endComputePass(),n.copyBufferToBuffer(t,0,s,0,a),e.flush(),await s.mapAsync(GPUMapMode.READ);let l=s.getMappedRange();if(i){let d=i();return d.set(new Uint8Array(l,0,r)),d}else return new Uint8Array(l.slice(0,r))}finally{s.destroy()}},Ts=class{constructor(e){this.backend=e,this.storageCache=new Map,this.freeBuffers=new Map,this.freeUniformBuffers=new Map,this.buffersForUploadingPending=[],this.buffersPending=[],this.capturedPendingBuffers=new Map;for(let[t]of _i)yr.push(t),this.freeBuffers.set(t,[]),this.freeUniformBuffers.set(t,[])}upload(e,t){let r=t.buffer,i=t.byteOffset,a=t.byteLength,s=wr(a),n=this.storageCache.get(e);if(!n)throw new Error("gpu data for uploading does not exist");if(n.originalSize!==a)throw new Error(`inconsistent data size. gpu data size=${n.originalSize}, data size=${a}`);let l=this.backend.device.createBuffer({mappedAtCreation:!0,size:s,usage:GPUBufferUsage.MAP_WRITE|GPUBufferUsage.COPY_SRC}),d=l.getMappedRange();new Uint8Array(d).set(new Uint8Array(r,i,a)),l.unmap();let p=this.backend.getCommandEncoder();this.backend.endComputePass(),p.copyBufferToBuffer(l,0,n.gpuData.buffer,0,s),ce("verbose",()=>`[WebGPU] GpuDataManager.upload(id=${e})`),this.buffersForUploadingPending.push(l)}memcpy(e,t){let r=this.storageCache.get(e);if(!r)throw new Error("source gpu data for memcpy does not exist");let i=this.storageCache.get(t);if(!i)throw new Error("destination gpu data for memcpy does not exist");if(r.originalSize!==i.originalSize)throw new Error("inconsistent source and destination gpu data size");let a=wr(r.originalSize),s=this.backend.getCommandEncoder();this.backend.endComputePass(),s.copyBufferToBuffer(r.gpuData.buffer,0,i.gpuData.buffer,0,a)}registerExternalBuffer(e,t,r){let i;if(r){if(i=r[0],e===r[1])return ce("verbose",()=>`[WebGPU] GpuDataManager.registerExternalBuffer(size=${t}) => id=${i}, buffer is the same, skip.`),i;if(this.backend.capturedCommandList.has(this.backend.currentSessionId))throw new Error(`Registering a different external buffer under graph capture mode is not supported yet.
             Please use the previous external buffer!`)}else i=vi();return this.storageCache.set(i,{gpuData:{id:i,type:0,buffer:e},originalSize:t}),ce("verbose",()=>`[WebGPU] GpuDataManager.registerExternalBuffer(size=${t}) => id=${i}, registered.`),i}unregisterExternalBuffer(e){e!==void 0&&(this.storageCache.delete(e),ce("verbose",()=>`[WebGPU] GpuDataManager.unregisterExternalBuffer() => id=${e}`))}create(e,t=GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST){let r=Es(e),i,a=(t&GPUBufferUsage.STORAGE)===GPUBufferUsage.STORAGE,s=(t&GPUBufferUsage.UNIFORM)===GPUBufferUsage.UNIFORM;if(a||s){let l=(a?this.freeBuffers:this.freeUniformBuffers).get(r);l?l.length>0?i=l.pop():i=this.backend.device.createBuffer({size:r,usage:t}):i=this.backend.device.createBuffer({size:r,usage:t})}else i=this.backend.device.createBuffer({size:r,usage:t});let n={id:vi(),type:0,buffer:i};return this.storageCache.set(n.id,{gpuData:n,originalSize:e}),ce("verbose",()=>`[WebGPU] GpuDataManager.create(size=${e}) => id=${n.id}`),n}get(e){var t;return(t=this.storageCache.get(e))==null?void 0:t.gpuData}release(e){let t=this.storageCache.get(e);if(!t)throw new Error("releasing data does not exist");return ce("verbose",()=>`[WebGPU] GpuDataManager.release(id=${e}), gpuDataId=${t.gpuData.id}`),this.storageCache.delete(e),this.buffersPending.push(t.gpuData.buffer),t.originalSize}async download(e,t){let r=this.storageCache.get(e);if(!r)throw new Error("data does not exist");await ta(this.backend,r.gpuData.buffer,r.originalSize,t)}refreshPendingBuffers(){for(let e of this.buffersForUploadingPending)e.destroy();if(this.buffersForUploadingPending=[],this.buffersPending.length!==0)if(this.backend.sessionStatus==="default"){for(let e of this.buffersPending){let t=_i.get(e.size);if((e.usage&GPUBufferUsage.STORAGE)===GPUBufferUsage.STORAGE){let r=this.freeBuffers.get(e.size)||[];t===void 0||r.length>=t?e.destroy():r.push(e)}else if((e.usage&GPUBufferUsage.UNIFORM)===GPUBufferUsage.UNIFORM){let r=this.freeUniformBuffers.get(e.size)||[];t===void 0||r.length>=t?e.destroy():r.push(e)}else e.destroy()}this.buffersPending=[]}else{let e=this.capturedPendingBuffers.get(this.backend.currentSessionId);e||(e=[],this.capturedPendingBuffers.set(this.backend.currentSessionId,e));for(let t of this.buffersPending)e.push(t);this.buffersPending=[]}}dispose(){this.freeBuffers.forEach(e=>{e.forEach(t=>{t.destroy()})}),this.freeUniformBuffers.forEach(e=>{e.forEach(t=>{t.destroy()})}),this.storageCache.forEach(e=>{e.gpuData.buffer.destroy()}),this.capturedPendingBuffers.forEach(e=>{e.forEach(t=>{t.destroy()})}),this.storageCache=new Map,this.freeBuffers=new Map,this.freeUniformBuffers=new Map,this.capturedPendingBuffers=new Map}onReleaseSession(e){let t=this.capturedPendingBuffers.get(e);t&&(t.forEach(r=>{r.destroy()}),this.capturedPendingBuffers.delete(e))}},od=(...e)=>new Ts(...e)}),Is,fe,be=D(()=>{Is=class{constructor(e){Object.assign(this,e)}get cacheKey(){return this.key||(this.key=Object.getOwnPropertyNames(this).sort().map(e=>`${this[e]}`).join(";")),this.key}},fe=e=>new Is(e)}),zs,Pt,O,Rr,ud,ld,dd,te=D(()=>{zs=class{static calcMatMulShape(e,t){return e[1]!==t[0]?void 0:[e[0],t[1]]}},Pt=class{static calcShape(e,t,r=!1){let i=e.length,a=t.length;if(i===0)return t;if(a===0)return e;let s=Math.max(e.length,t.length),n=new Array(s);if(r){if(i<2||a<2)return;let l=zs.calcMatMulShape([e[i-2],e[i-1]],[t[a-2],t[a-1]]);if(l===void 0)return;[n[s-2],n[s-1]]=l}for(let l=r?3:1;l<=s;l++){let d=i-l<0?1:e[i-l],p=a-l<0?1:t[a-l];if(d!==p&&d>1&&p>1)return;let f=Math.max(d,p);if(d&&p)n[s-l]=Math.max(d,p);else{if(f>1)return;n[s-l]=0}}return n}static isValidBroadcast(e,t){let r=e.length,i=t.length;if(r>i)return!1;for(let a=1;a<=r;a++)if(e[r-a]!==1&&e[r-a]!==t[i-a])return!1;return!0}},O=class Cr{static size(t){return Cr.getSizeFromDimensionRange(t,0,t.length)}static convertShape(t,r=4){let i=t.length;if(i===0)return[];let a=new Array(i),s=i-1;for(;s>=0;){if(t[s]%r===0){a[s]=t[s]/r;break}if(r%t[s]!==0)throw new Error("cannot convert shape");a[s]=1,r/=t[s],s--}for(s--;s>=0;s--)a[s]=t[s];return a}static sizeFromDimension(t,r){if(r<0||r>t.length)throw new Error(`invalid dimension of ${r} for sizeFromDimension as Tensor has ${t.length} dimensions.`);return Cr.getSizeFromDimensionRange(t,r,t.length)}static sizeToDimension(t,r){if(r<0||r>t.length)throw new Error(`invalid dimension of ${r} for sizeToDimension as Tensor has ${t.length} dimensions.`);return Cr.getSizeFromDimensionRange(t,0,r)}static getSizeFromDimensionRange(t,r,i){let a=1;for(let s=r;s<i;s++){if(t[s]<0)throw new Error("cannot get valid size from specified dimension range. Most likely the range contains negative values in them.");a*=t[s]}return a}static computeStrides(t){let r=t.length;if(r===0)return[];if(r===1)return[1];let i=new Array(r);i[r-1]=1,i[r-2]=t[r-1];for(let a=r-3;a>=0;--a)i[a]=i[a+1]*t[a+1];return i}static normalizeAxis(t,r){if(t<-r&&t>=r)throw new Error("unsupported axis for this operation.");return t<0?t+r:t}static normalizeAxes(t,r){return t.map(i=>this.normalizeAxis(i,r??t.length))}static sortBasedOnPerm(t,r){return r?r.map(i=>t[i]):t.slice().reverse()}static padShape(t,r){let i=t.length;return t.map((a,s)=>a+r[s]+r[s+i])}static areEqual(t,r){return t.length!==r.length?!1:t.every((i,a)=>i===r[a])}},Rr=class Yt{static adjustPoolAttributes(t,r,i,a,s,n){if(!t&&i.length!==r.length-2)throw new Error("length of specified kernel shapes should be 2 less than length of input dimensions");if(t)for(let l=0;l<r.length-2;l++)l>=i.length?i.push(r[l+2]):i[l]=r[l+2];for(let l=0;l<i.length;l++)if(l<a.length){if(a[l]<0)throw new Error("strides should be greater than or equal to 1")}else a.push(1);for(let l=0;l<i.length;l++)if(l<s.length){if(s[l]<0)throw new Error("dilations should be greater than or equal to 1")}else s.push(1);for(let l=0;l<i.length*2;l++)if(l<n.length){if(n[l]<0)throw new Error("pad should be greater than or equal to 1")}else n.push(0);for(let l=0;l<i.length;l++){if(i[l]<=0)throw new Error("kernel shapes need to be greater than 0");if(n[l]>=i[l]||n[l+i.length]>=i[l])throw new Error("pads should be smaller than kernel")}}static adjustPadsBasedOnAutoPad(t,r,i,a,s,n,l){if(l){if(s.length!==2*(t.length-2))throw new Error("length of pads should be twice the length of data dimensions");if(r.length!==t.length-2)throw new Error("length of strides should be the length of data dimensions");if(a.length!==t.length-2)throw new Error("length of kernel shapes should be the length of data dimensions");for(let d=0;d<t.length-2;d++)Yt.adjustPadAndReturnShape(t[d+(n?1:2)],r[d],i[d],a[d],s,d,d+t.length-2,l)}}static computePoolOutputShape(t,r,i,a,s,n,l){if(r.length<=0)throw new Error("input shape must be of size greater than 0");let d=[r[0],r[1]];return Yt.computeShapeHelper(t,r,d,i,a,s,n,l),d}static computeConvOutputShape(t,r,i,a,s,n,l){if(t.length<=0||r.length<=0)throw new Error("invalid input tensor dims or invalid filter tensor dims");let d=[t[0],r[0]];return Yt.computeShapeHelper(!1,t,d,i,a,s,n,l),d}static computeShapeHelper(t,r,i,a,s,n,l,d){if(t)for(let p=0;p<r.length-2;p++)i.push(1);else for(let p=0;p<r.length-2;p++)i.push(Yt.adjustPadAndReturnShape(r[p+2],a[p],s[p],n[p],l,p,p+r.length-2,d))}static adjustPadAndReturnShape(t,r,i,a,s,n,l,d){let p=i*(a-1)+1;if(d&&d!=="NOTSET")switch(d){case"VALID":return s[n]=0,s[l]=0,Math.floor((t-p)/r+1);case"SAME_LOWER":case"SAME_UPPER":if(i!==1)throw new Error("Dilation not supported for SAME_UPPER or SAME_LOWER");{let f=((t+r-1)/r-1)*r+a-t;return s[n]=Math.floor(d==="SAME_LOWER"?(f+1)/2:f/2),s[l]=f-s[n],Math.floor((t+f-a)/r+1)}default:throw new Error("Unsupported AutoPad type")}else return Math.floor((t+s[n]+s[l]-p)/r+1)}},ud=class{static getShapeOfGemmResult(e,t,r,i,a){if(e.length!==2||r.length!==2)throw new Error("shape need to be of size 2");let s,n,l;t?(s=e[1],n=e[0]):(s=e[0],n=e[1]);let d=-1;if(i?(l=r[0],d=1):(l=r[1],d=0),r[d]!==n)throw new Error("dimension mismatch");if(s<=0||l<=0||n<=0)throw new Error("invalid shape specified");if(a&&!Pt.isValidBroadcast(a,[s,l]))throw new Error("gemm: invalid bias shape for broadcast");return[s,l,n]}},ld=-34028234663852886e22,dd=34028234663852886e22}),Dt,$r,Se,ze,L,_e,ra,Mt,ht,G,_r,B,F,Ia,As,pd,Xt,re=D(()=>{X(),te(),Dt=64,$r=(e,t)=>{if(t===3)throw new Error("vec3 has same alignment as vec4, use vec4 instead");switch(e){case 10:return t>1?`vec${t}<f16>`:"f16";case 1:return t>1?`vec${t}<f32>`:"f32";case 6:return t>1?`vec${t}<i32>`:"i32";case 12:return t>1?`vec${t}<u32>`:"u32";case 7:if(t>1)throw new Error("currently not supported vecX of uint64 yet");return["vec2<u32>","i32"];case 13:if(t>1)throw new Error("currently not supported vecX of uint64 yet");return["vec2<u32>","u32"];case 9:if(t!==4)throw new Error("bool must be vec4");return["u32","vec4<bool>"];case 22:return"i32";case 21:return"u32";default:throw new Error(`Unknown data type: ${e}`)}},Se=(e,t=1)=>{let r=$r(e,t);return typeof r=="string"?r:r[0]},ze=(e,t=1)=>{let r=$r(e,t);return typeof r=="string"?r:r[1]},L=(...e)=>{let t=[];return e.forEach(r=>{r.length!==0&&t.push({type:12,data:r},{type:12,data:O.computeStrides(r)})}),t},_e=e=>e%4===0?4:e%2===0?2:1,ra=(e="f32",t,r="0")=>!t||t===1?`${e}(${r})`:`vec${t}<${e}>(${r})`,Mt=(e,t,r)=>e==="f32"?r:t===1?`f32(${r})`:`vec${t}<f32>(${r})`,ht=(e,t)=>t===4?`(${e}.x + ${e}.y + ${e}.z + ${e}.w)`:t===2?`(${e}.x + ${e}.y)`:t===3?`(${e}.x + ${e}.y + ${e}.z)`:e,G=(e,t,r,i)=>e.startsWith("uniforms.")&&r>4?typeof t=="string"?i==="f16"?`${e}[(${t}) / 8][(${t}) % 8 / 4][(${t}) % 8 % 4]`:`${e}[(${t}) / 4][(${t}) % 4]`:i==="f16"?`${e}[${Math.floor(t/8)}][${Math.floor(t%8/4)}][${t%8%4}]`:`${e}[${Math.floor(t/4)}][${t%4}]`:r>1?`${e}[${t}]`:e,_r=(e,t,r,i,a)=>{let s=typeof r=="number",n=s?r:r.length,l=[...new Array(n).keys()],d=n<2?"u32":n<=4?`vec${n}<u32>`:`array<u32, ${n}>`,p=$r(t,a),f=typeof p=="string"?p:p[1],c=typeof p=="string"?p:p[0],u={indices:d,value:f,storage:c,tensor:t},y=A=>typeof A=="string"?A:`${A}u`,w={offsetToIndices:!1,indicesToOffset:!1,broadcastedIndicesToOffset:!1,set:!1,setByIndices:!1,get:!1,getByIndices:!1},$=s?"uniforms.":"",b=`${$}${e}_shape`,x=`${$}${e}_strides`,v="";for(let A=0;A<n-1;A++)v+=`
    let dim${A} = current / ${G(x,A,n)};
    let rest${A} = current % ${G(x,A,n)};
    indices[${A}] = dim${A};
    current = rest${A};
    `;v+=`indices[${n-1}] = current;`;let k=n<2?"":`
  fn o2i_${e}(offset: u32) -> ${u.indices} {
    var indices: ${u.indices};
    var current = offset;
    ${v}
    return indices;
  }`,S=A=>(w.offsetToIndices=!0,n<2?A:`o2i_${e}(${A})`),E=[];if(n>=2)for(let A=n-1;A>=0;A--)E.push(`${G(x,A,n)} * (indices[${A}])`);let z=n<2?"":`
  fn i2o_${e}(indices: ${u.indices}) -> u32 {
    return ${E.join("+")};
  }`,T=A=>(w.indicesToOffset=!0,n<2?A:`i2o_${e}(${A})`),M=(...A)=>n===0?"0u":`${u.indices}(${A.map(y).join(",")})`,W=(A,U)=>n<2?`${A}`:`${G(A,U,n)}`,V=(A,U,Q)=>n<2?`${A}=${Q};`:`${G(A,U,n)}=${Q};`,J={},ee=(A,U)=>{w.broadcastedIndicesToOffset=!0;let Q=`${U.name}broadcastedIndicesTo${e}Offset`;if(Q in J)return`${Q}(${A})`;let ue=[];for(let $e=n-1;$e>=0;$e--){let ve=U.indicesGet("outputIndices",$e+U.rank-n);ue.push(`${W(x,$e)} * (${ve} % ${W(b,$e)})`)}return J[Q]=`fn ${Q}(outputIndices: ${U.type.indices}) -> u32 {
             return ${ue.length>0?ue.join("+"):"0u"};
           }`,`${Q}(${A})`},H=(A,U)=>(()=>{if(u.storage===u.value)return`${e}[${A}]=${U};`;if(u.storage==="vec2<u32>"&&u.value==="i32")return`${e}[${A}]=vec2<u32>(u32(${U}), select(0u, 0xFFFFFFFFu, ${U} < 0));`;if(u.storage==="vec2<u32>"&&u.value==="u32")return`${e}[${A}]=vec2<u32>(u32(${U}), 0u);`;if(u.storage==="u32"&&u.value==="vec4<bool>")return`${e}[${A}]=dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(${U}));`;throw new Error(`not supported combination of storage type ${u.storage} and value type ${u.value} yet`)})(),oe=A=>(()=>{if(u.storage===u.value)return`${e}[${A}]`;if(u.storage==="vec2<u32>"&&u.value==="i32")return`i32(${e}[${A}].x)`;if(u.storage==="vec2<u32>"&&u.value==="u32")return`u32(${e}[${A}].x)`;if(u.storage==="u32"&&u.value==="vec4<bool>")return`vec4<bool>(bool(${e}[${A}] & 0xFFu), bool(${e}[${A}] & 0xFF00u), bool(${e}[${A}] & 0xFF0000u), bool(${e}[${A}] & 0xFF000000u))`;throw new Error(`not supported combination of storage type ${u.storage} and value type ${u.value} yet`)})(),he=n<2?"":`
  fn get_${e}ByIndices(indices: ${u.indices}) -> ${f} {
    return ${oe(`i2o_${e}(indices)`)};
  }`,ie=n<2?"":(()=>{let A=l.map(Q=>`d${Q}: u32`).join(", "),U=l.map(Q=>`d${Q}`).join(", ");return`
  fn get_${e}(${A}) -> ${f} {
    return get_${e}ByIndices(${M(U)});
  }`})(),de=(...A)=>{if(A.length!==n)throw new Error(`indices length must be ${n}`);let U=A.map(y).join(",");return n===0?oe("0u"):n===1?oe(U[0]):(w.get=!0,w.getByIndices=!0,w.indicesToOffset=!0,`get_${e}(${U})`)},j=A=>n<2?oe(A):(w.getByIndices=!0,w.indicesToOffset=!0,`get_${e}ByIndices(${A})`),Z=n<2?"":`
  fn set_${e}ByIndices(indices: ${u.indices}, value: ${f}) {
    ${H(`i2o_${e}(indices)`,"value")}
  }`,ne=n<2?"":(()=>{let A=l.map(Q=>`d${Q}: u32`).join(", "),U=l.map(Q=>`d${Q}`).join(", ");return`
  fn set_${e}(${A}, value: ${f}) {
    set_${e}ByIndices(${M(U)}, value);
  }`})();return{impl:()=>{let A=[],U=!1;return w.offsetToIndices&&(A.push(k),U=!0),w.indicesToOffset&&(A.push(z),U=!0),w.broadcastedIndicesToOffset&&(Object.values(J).forEach(Q=>A.push(Q)),U=!0),w.set&&(A.push(ne),U=!0),w.setByIndices&&(A.push(Z),U=!0),w.get&&(A.push(ie),U=!0),w.getByIndices&&(A.push(he),U=!0),!s&&U&&A.unshift(`const ${b} = ${u.indices}(${r.join(",")});`,`const ${x} = ${u.indices}(${O.computeStrides(r).join(",")});`),A.join(`
`)},type:u,offsetToIndices:S,indicesToOffset:T,broadcastedIndicesToOffset:ee,indices:M,indicesGet:W,indicesSet:V,set:(...A)=>{if(A.length!==n+1)throw new Error(`indices length must be ${n}`);let U=A[n];if(typeof U!="string")throw new Error("value must be string");let Q=A.slice(0,n).map(y).join(",");return n===0?H("0u",U):n===1?H(Q[0],U):(w.set=!0,w.setByIndices=!0,w.indicesToOffset=!0,`set_${e}(${Q}, ${U})`)},setByOffset:H,setByIndices:(A,U)=>n<2?H(A,U):(w.setByIndices=!0,w.indicesToOffset=!0,`set_${e}ByIndices(${A}, ${U});`),get:de,getByOffset:oe,getByIndices:j,usage:i,name:e,strides:x,shape:b,rank:n}},B=(e,t,r,i=1)=>_r(e,t,r,"input",i),F=(e,t,r,i=1)=>_r(e,t,r,"output",i),Ia=(e,t,r,i=1)=>_r(e,t,r,"internal",i),As=class{constructor(e,t){this.normalizedDispatchGroup=e,this.limits=t,this.internalVariables=[],this.variables=[],this.uniforms=[],this.variableIndex=0}guardAgainstOutOfBoundsWorkgroupSizes(e){return`if (global_idx >= ${typeof e=="number"?`${e}u`:e}) { return; }`}mainStart(e=Dt){let t=typeof e=="number"?e:e[0],r=typeof e=="number"?1:e[1],i=typeof e=="number"?1:e[2];if(t>this.limits.maxComputeWorkgroupSizeX||r>this.limits.maxComputeWorkgroupSizeY||i>this.limits.maxComputeWorkgroupSizeZ)throw new Error(`workgroup size [${t}, ${r}, ${i}] exceeds the maximum workgroup size [${this.limits.maxComputeWorkgroupSizeX}, ${this.limits.maxComputeWorkgroupSizeY}, ${this.limits.maxComputeWorkgroupSizeZ}].`);if(t*r*i>this.limits.maxComputeInvocationsPerWorkgroup)throw new Error(`workgroup size [${t}, ${r}, ${i}] exceeds the maximum workgroup invocations ${this.limits.maxComputeInvocationsPerWorkgroup}.`);let a=this.normalizedDispatchGroup[1]===1&&this.normalizedDispatchGroup[2]===1,s=a?`@builtin(global_invocation_id) global_id : vec3<u32>,
    @builtin(workgroup_id) workgroup_id : vec3<u32>,
    @builtin(local_invocation_index) local_idx : u32,
    @builtin(local_invocation_id) local_id : vec3<u32>`:`@builtin(global_invocation_id) global_id : vec3<u32>,
                                             @builtin(local_invocation_id) local_id : vec3<u32>,
    @builtin(local_invocation_index) local_idx : u32,
    @builtin(workgroup_id) workgroup_id : vec3<u32>,
    @builtin(num_workgroups) num_workgroups : vec3<u32>`,n=a?`let global_idx = global_id.x;
         let workgroup_index = workgroup_id.x;`:`let workgroup_index = workgroup_id.z * num_workgroups[0] * num_workgroups[1] +
             workgroup_id.y * num_workgroups[0] + workgroup_id.x;
         let global_idx = workgroup_index * ${t*r*i}u + local_idx;`;return`@compute @workgroup_size(${t}, ${r}, ${i})
  fn main(${s}) {
    ${n}
  `}appendVariableUniforms(e){e.rank!==0&&(e.shape.startsWith("uniforms.")&&this.uniforms.push({name:e.shape.replace("uniforms.",""),type:"u32",length:e.rank}),e.strides.startsWith("uniforms.")&&this.uniforms.push({name:e.strides.replace("uniforms.",""),type:"u32",length:e.rank}))}declareVariable(e,t){if(e.usage==="internal")throw new Error("cannot use internal variable with declareVariable(). use registerInternalVariables() instead.");this.variables.push(e),this.appendVariableUniforms(e);let r=e.usage==="input"?"read":"read_write",i=e.type.storage;return`@group(0) @binding(${t}) var<storage, ${r}> ${e.name}: array<${i}>;`}declareVariables(...e){return e.map(t=>this.declareVariable(t,this.variableIndex++)).join(`
`)}registerInternalVariable(e){if(e.usage!=="internal")throw new Error("cannot use input or output variable with registerInternalVariable(). use declareVariables() instead.");this.internalVariables.push(e),this.appendVariableUniforms(e)}registerInternalVariables(...e){return e.forEach(t=>this.registerInternalVariable(t)),this}registerUniform(e,t,r=1){return this.uniforms.push({name:e,type:t,length:r}),this}registerUniforms(e){return this.uniforms=this.uniforms.concat(e),this}uniformDeclaration(){if(this.uniforms.length===0)return"";let e=[];for(let{name:t,type:r,length:i}of this.uniforms)if(i&&i>4)r==="f16"?e.push(`@align(16) ${t}:array<mat2x4<${r}>, ${Math.ceil(i/8)}>`):e.push(`${t}:array<vec4<${r}>, ${Math.ceil(i/4)}>`);else{let a=i==null||i===1?r:`vec${i}<${r}>`;e.push(`${t}:${a}`)}return`
      struct Uniforms { ${e.join(", ")} };
      @group(0) @binding(${this.variableIndex}) var<uniform> uniforms: Uniforms;`}get additionalImplementations(){return this.uniformDeclaration()+this.variables.map(e=>e.impl()).join(`
`)+this.internalVariables.map(e=>e.impl()).join(`
`)}get variablesInfo(){if(this.uniforms.length===0)return;let e=t=>[12,10,1,6][["u32","f16","f32","i32"].indexOf(t)];return this.uniforms.map(t=>[e(t.type),t.length??1])}},pd=(e,t)=>new As(e,t),Xt=(e,t)=>{let r=e.length,i=[];for(let a=0;a<r;a++){let s=r-1-a,n=e[s]||1;(t[t.length-1-a]||1)>1&&n===1&&i.unshift(s)}return i}}),Os,bi,Rs,Bs,Ms,De,hd,cd,gt=D(()=>{X(),te(),be(),re(),Os=e=>{if(!e||e.length!==1)throw new Error("Transpose requires 1 input.")},bi=(e,t)=>t&&t.length!==e?[...new Array(e).keys()].reverse():t,Rs=(e,t)=>O.sortBasedOnPerm(e,bi(e.length,t)),Bs=(e,t,r,i)=>{let a=`fn perm(i: ${i.type.indices}) -> ${r.type.indices} {
    var a: ${r.type.indices};`;for(let s=0;s<t;++s)a+=r.indicesSet("a",e[s],`i[${s}]`);return a+="return a;}"},Ms=(e,t)=>{let r=[],i=[];for(let a=0;a<e.length;++a)e[a]!==1&&r.push(e[a]),e[t[a]]!==1&&i.push(t[a]);return{newShape:r,newPerm:i}},De=(e,t)=>{let r=e.dataType,i=e.dims.length,a=bi(i,t),s=Rs(e.dims,a),{newShape:n,newPerm:l}=Ms(e.dims,a),d=O.areEqual(l,[2,3,1]),p=O.areEqual(l,[3,1,2]),f=n.length===2&&l[0]>l[1]||d||p,c=f?n:e.dims,u=s;f&&(c=d?[n[0],n[1]*n[2]]:p?[n[0]*n[1],n[2]]:n,u=[c[1],c[0]]);let y=B("a",r,c.length),w=F("output",r,u.length),$=16,b;return f?b=x=>`
  ${x.registerUniform("output_size","u32").declareVariables(y,w)}
  var<workgroup> tile : array<array<${w.type.value}, ${$+1}>, ${$}>;
  ${x.mainStart([$,$,1])}
    let stride = (uniforms.output_shape[1] - 1) / ${$} + 1;
    let workgroup_id_x = workgroup_index % stride;
    let workgroup_id_y = workgroup_index / stride;
    let input_col = workgroup_id_y * ${$}u + local_id.x;
    let input_row = workgroup_id_x * ${$}u + local_id.y;
    if (input_row < uniforms.a_shape[0] && input_col < uniforms.a_shape[1]) {
      tile[local_id.y][local_id.x] = ${y.getByIndices(`${y.type.indices}(input_row, input_col)`)};
    }
    workgroupBarrier();

    let output_col = workgroup_id_x * ${$}u + local_id.x;
    let output_row = workgroup_id_y * ${$}u + local_id.y;
    if (output_row < uniforms.output_shape[0] && output_col < uniforms.output_shape[1]) {
      ${w.setByIndices(`${w.type.indices}(output_row, output_col)`,"tile[local_id.x][local_id.y]")}
    }
  }`:b=x=>`
  ${x.registerUniform("output_size","u32").declareVariables(y,w)}

  ${Bs(a,i,y,w)}

  ${x.mainStart()}
    ${x.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let indices = ${w.offsetToIndices("global_idx")};
    let aIndices = perm(indices);

    ${w.setByOffset("global_idx",y.getByIndices("aIndices"))}
  }`,{name:f?"TransposeShared":"Transpose",shaderCache:{hint:`${t}`,inputDependencies:["rank"]},getRunData:()=>{let x=O.size(s);return{outputs:[{dims:s,dataType:e.dataType}],dispatchGroup:f?{x:Math.ceil(u[1]/$),y:Math.ceil(u[0]/$)}:{x:Math.ceil(x/64)},programUniforms:[{type:12,data:x},...L(c,u)]}},getShaderSource:b}},hd=(e,t)=>{Os(e.inputs),e.compute(De(e.inputs[0],t.perm))},cd=e=>fe({perm:e.perm})}),Ps,Ds,Us,Ns,Ws,qs,Vs,Ls,js,Gs,Ve,fd,md,gd,yd,wd,$d,_d,vd,bd,xd,Yf=D(()=>{X(),te(),re(),za(),gt(),Ps={max:"select(bestValue, candidate, candidate > bestValue)",min:"select(bestValue, candidate, candidate < bestValue)",mean:"bestValue + candidate",sum:"bestValue + candidate",prod:"bestValue * candidate",sumSquare:"bestValue + candidate * candidate",logSumExp:"bestValue + exp(candidate)",l1:"bestValue + abs(candidate)",l2:"bestValue + candidate * candidate",logSum:"bestValue + candidate"},Ds={max:"select(bestValue, candidate, candidate > bestValue)",min:"select(bestValue, candidate, candidate < bestValue)",mean:"bestValue + candidate",sum:"bestValue + candidate",prod:"bestValue * candidate",sumSquare:"bestValue + candidate",logSumExp:"bestValue + candidate",l1:"bestValue + candidate",l2:"bestValue + candidate",logSum:"bestValue + candidate"},Us={max:"_A[offset]",min:"_A[offset]",mean:"0",sum:"0",prod:"1",sumSquare:"0",logSumExp:"0",l1:"0",l2:"0",logSum:"0"},Ns={max:"bestValue",min:"bestValue",sum:"bestValue",prod:"bestValue",sumSquare:"bestValue",logSumExp:"log(bestValue)",l1:"bestValue",l2:"sqrt(bestValue)",logSum:"log(bestValue)"},Ws=(e,t)=>{let r=[];for(let i=t-e;i<t;++i)r.push(i);return r},qs=(e,t)=>{let r=[],i=e.length;for(let s=0;s<i;s++)t.indexOf(s)===-1&&r.push(e[s]);let a=t.map(s=>e[s]);return[r,a]},Vs=(e,t)=>{let r=e.length+t.length,i=[],a=0;for(let s=0;s<r;s++)t.indexOf(s)===-1?i.push(e[a++]):i.push(1);return i},Ls=(e,t)=>{for(let r=0;r<e.length;++r)if(e[e.length-r-1]!==t-1-r)return!1;return!0},js=(e,t)=>{let r=[];if(!Ls(e,t)){for(let i=0;i<t;++i)e.indexOf(i)===-1&&r.push(i);e.forEach(i=>r.push(i))}return r},Gs=(e,t,r,i,a,s,n)=>{let l=r[0].dims,d=O.size(s),p=O.size(n),f=B("_A",r[0].dataType,l),c=F("output",a,s),u=32,y=`
          var<workgroup> aBestValues : array<f32, ${u}>;
       `;return{name:e,shaderCache:t,getShaderSource:w=>`
        ${w.registerUniform("reduceSize","u32").declareVariables(f,c)}
        ${y}
        fn DIV_CEIL(a : u32, b : u32) -> u32 {
          return ((a - 1u) / b + 1u);
         }
         ${w.mainStart(u)}

          let outputIndex = global_idx / ${u};
          let offset = outputIndex * uniforms.reduceSize;

          var bestValue = f32(${Us[i]});
          let Length = uniforms.reduceSize;
          for (var k = local_idx; k < Length; k = k + ${u}) {
           let candidate = f32(${f.getByOffset("offset + k")});
           bestValue = ${Ps[i]};
          }
          aBestValues[local_idx] = bestValue;
          workgroupBarrier();

         var reduceSize = min(Length, ${u}u);
         for (var currentSize = reduceSize / 2u; reduceSize > 1u;
             currentSize = reduceSize / 2u) {
           let interval = DIV_CEIL(reduceSize, 2u);
           if (local_idx < currentSize) {
            let candidate = aBestValues[local_idx + interval];
            bestValue = ${Ds[i]};
            aBestValues[local_idx] = bestValue;
           }
           reduceSize = interval;
           workgroupBarrier();
         }

         if (local_idx == 0u) {
          ${c.setByOffset("outputIndex",`${i==="mean"?`${c.type.storage}(bestValue / f32(uniforms.reduceSize))`:`${c.type.storage}(${Ns[i]})`}`)};
         }
        }`,getRunData:()=>({outputs:[{dims:s,dataType:a}],dispatchGroup:{x:d},programUniforms:[{type:12,data:p}]})}},Ve=(e,t,r,i)=>{let a=e.inputs.length===1?r:ia(e.inputs,r),s=a.axes;s.length===0&&!a.noopWithEmptyAxes&&(s=e.inputs[0].dims.map((y,w)=>w));let n=O.normalizeAxes(s,e.inputs[0].dims.length),l=n,d=e.inputs[0],p=js(l,e.inputs[0].dims.length);p.length>0&&(d=e.compute(De(e.inputs[0],p),{inputs:[0],outputs:[-1]})[0],l=Ws(l.length,d.dims.length));let[f,c]=qs(d.dims,l),u=f;a.keepDims&&(u=Vs(f,n)),e.compute(Gs(t,{hint:a.cacheKey,inputDependencies:["type"]},[d],i,e.inputs[0].dataType,u,c),{inputs:[d]})},fd=(e,t)=>{Ve(e,"ReduceMeanShared",t,"mean")},md=(e,t)=>{Ve(e,"ReduceL1Shared",t,"l1")},gd=(e,t)=>{Ve(e,"ReduceL2Shared",t,"l2")},yd=(e,t)=>{Ve(e,"ReduceLogSumExpShared",t,"logSumExp")},wd=(e,t)=>{Ve(e,"ReduceMaxShared",t,"max")},$d=(e,t)=>{Ve(e,"ReduceMinShared",t,"min")},_d=(e,t)=>{Ve(e,"ReduceProdShared",t,"prod")},vd=(e,t)=>{Ve(e,"ReduceSumShared",t,"sum")},bd=(e,t)=>{Ve(e,"ReduceSumSquareShared",t,"sumSquare")},xd=(e,t)=>{Ve(e,"ReduceLogSumShared",t,"logSum")}}),Le,Fs,Br,ia,je,Hs,Ks,Ys,Zs,Qs,Xs,Js,eo,to,ro,Ge,Sd,kd,Ed,Cd,Td,Id,zd,Ad,Od,Rd,za=D(()=>{X(),te(),be(),re(),Yf(),Le=e=>{if(!e||e.length===0||e.length>2)throw new Error("Reduce op requires 1 or 2 inputs.");if(e.length===2&&e[1].dims.length!==1)throw new Error("Invalid axes input dims.")},Fs=e=>["","",`var value = ${e.getByIndices("input_indices")};`,""],Br=(e,t,r,i,a,s,n=!1,l=!1)=>{let d=[],p=r[0].dims,f=p.length,c=O.normalizeAxes(a,f),u=!l&&c.length===0;p.forEach(($,b)=>{u||c.indexOf(b)>=0?n&&d.push(1):d.push($)});let y=d.length,w=O.size(d);return{name:e,shaderCache:t,getShaderSource:$=>{let b=[],x=B("_A",r[0].dataType,f),v=F("output",s,y),k=i(x,v,c),S=k[2];for(let E=0,z=0;E<f;E++)u||c.indexOf(E)>=0?(n&&z++,S=`for(var j${E}: u32 = 0; j${E} < ${p[E]}; j${E}++) {
                  ${k[2].includes("last_index")?`let last_index = j${E};`:""}
                  ${x.indicesSet("input_indices",E,`j${E}`)}
                  ${S}
                }`):(b.push(`${x.indicesSet("input_indices",E,v.indicesGet("output_indices",z))};`),z++);return`

        ${$.registerUniform("output_size","u32").declareVariables(x,v)}

        ${$.mainStart()}
          ${$.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
          var input_indices: ${x.type.indices};
          let output_indices = ${v.offsetToIndices("global_idx")};

          ${b.join(`
`)}
          ${k[0]}       // init ops for reduce max/min
          ${k[1]}
          ${S}
          ${k[3]}
          ${k.length===4?v.setByOffset("global_idx","value"):k.slice(4).join(`
`)}
        }`},getRunData:()=>({outputs:[{dims:d,dataType:s}],dispatchGroup:{x:Math.ceil(w/64)},programUniforms:[{type:12,data:w},...L(p,d)]})}},ia=(e,t)=>{let r=[];return e[1].dims[0]>0&&e[1].getBigInt64Array().forEach(i=>r.push(Number(i))),fe({axes:r,keepDims:t.keepDims,noopWithEmptyAxes:t.noopWithEmptyAxes})},je=(e,t,r,i)=>{let a=e.inputs,s=a.length===1?r:ia(a,r);e.compute(Br(t,{hint:s.cacheKey,inputDependencies:["rank"]},[a[0]],s.noopWithEmptyAxes&&s.axes.length===0?Fs:i,s.axes,a[0].dataType,s.keepDims,s.noopWithEmptyAxes),{inputs:[0]})},Hs=(e,t)=>{Le(e.inputs),je(e,"ReduceLogSum",t,(r,i)=>[`var value = ${i.type.storage}(0);`,"",`value += ${r.getByIndices("input_indices")};`,"value = log(value);"])},Ks=(e,t)=>{Le(e.inputs),je(e,"ReduceL1",t,(r,i)=>[`var value = ${i.type.storage}(0);`,"",`value += abs(${r.getByIndices("input_indices")});`,""])},Ys=(e,t)=>{Le(e.inputs),je(e,"ReduceL2",t,(r,i)=>[`var t = ${i.type.value}(0); var value = ${i.type.value}(0);`,"",`t = ${r.getByIndices("input_indices")}; value += (t * t);`,"value = sqrt(value);"])},Zs=(e,t)=>{Le(e.inputs),je(e,"ReduceLogSumExp",t,(r,i)=>[`var value = ${i.type.storage}(0);`,"",`value += exp(${r.getByIndices("input_indices")});`,"value = log(value);"])},Qs=(e,t)=>{Le(e.inputs),je(e,"ReduceMax",t,(r,i,a)=>{let s=[];for(let n=0;n<r.rank;n++)(a.indexOf(n)>=0||a.length===0)&&s.push(r.indicesSet("input_indices",n,0));return[`${s.join(`
`)}`,`var value = ${r.getByIndices("input_indices")};`,`value = max(value, ${r.getByIndices("input_indices")});`,""]})},Xs=(e,t)=>{Le(e.inputs),je(e,"ReduceMean",t,(r,i,a)=>{let s=1;for(let n=0;n<r.rank;n++)(a.indexOf(n)>=0||a.length===0)&&(s*=e.inputs[0].dims[n]);return["var sum = f32(0);","",`sum += f32(${r.getByIndices("input_indices")});`,`let value = ${i.type.value}(sum / ${s});`]})},Js=(e,t)=>{Le(e.inputs),je(e,"ReduceMin",t,(r,i,a)=>{let s=[];for(let n=0;n<r.rank;n++)(a.indexOf(n)>=0||a.length===0)&&s.push(`input_indices[${n}] = 0;`);return[`${s.join(`
`)}`,`var value = ${r.getByIndices("input_indices")};`,`value = min(value, ${r.getByIndices("input_indices")});`,""]})},eo=(e,t)=>{Le(e.inputs),je(e,"ReduceProd",t,(r,i)=>[`var value = ${i.type.storage}(1);`,"",`value *= ${r.getByIndices("input_indices")};`,""])},to=(e,t)=>{Le(e.inputs),je(e,"ReduceSum",t,(r,i)=>[`var value = ${i.type.storage}(0);`,"",`value += ${r.getByIndices("input_indices")};`,""])},ro=(e,t)=>{Le(e.inputs),je(e,"ReduceSumSquare",t,(r,i)=>[`var t = ${i.type.value}(0); var value = ${i.type.value}(0);`,"",`t = ${r.getByIndices("input_indices")}; value += t * t;`,""])},Ge=(e,t,r)=>{if(t.length===0)return r;let i=1,a=1;for(let s=0;s<t.length;s++)t.indexOf(s)===-1?i*=e[s]:a*=e[s];return a<32&&i>1024},Sd=(e,t)=>{Ge(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Xs(e,t):fd(e,t)},kd=(e,t)=>{Ge(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Ks(e,t):md(e,t)},Ed=(e,t)=>{Ge(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Ys(e,t):gd(e,t)},Cd=(e,t)=>{Ge(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Zs(e,t):yd(e,t)},Td=(e,t)=>{Ge(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Qs(e,t):wd(e,t)},Id=(e,t)=>{Ge(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Js(e,t):$d(e,t)},zd=(e,t)=>{Ge(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?eo(e,t):_d(e,t)},Ad=(e,t)=>{Ge(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?to(e,t):vd(e,t)},Od=(e,t)=>{Ge(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?ro(e,t):bd(e,t)},Rd=(e,t)=>{Ge(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Hs(e,t):xd(e,t)}}),xi,Bd,Md,aa,Zf=D(()=>{X(),be(),za(),xi=e=>{if(!e||e.length===0||e.length>2)throw new Error("ArgMinMaxOp op requires 1 or 2 inputs.");if(e[0].dataType!==1)throw new Error("Invalid input type.")},Bd=(e,t)=>{xi(e.inputs);let r=(i,a,s)=>{let n=[];for(let l=0;l<i.rank;l++)(s.indexOf(l)>=0||s.length===0)&&n.push(`input_indices[${l}] = 0;`);return[`${n.join(`
`)}`,`var value = ${i.getByIndices("input_indices")};
var best_index : i32 = 0;`,`if (${i.getByIndices("input_indices")} ${t.selectLastIndex>0?"<=":"<"} value) {
         value = ${i.getByIndices("input_indices")};
         best_index = i32(last_index);
       }`,"",a.setByOffset("global_idx","best_index")]};e.compute(Br("ArgMin",{hint:t.cacheKey,inputDependencies:["rank"]},[e.inputs[0]],r,[t.axis],7,t.keepDims),{inputs:[0]})},Md=(e,t)=>{xi(e.inputs);let r=(i,a,s)=>{let n=[];for(let l=0;l<i.rank;l++)(s.indexOf(l)>=0||s.length===0)&&n.push(`input_indices[${l}] = 0;`);return[`${n.join(`
`)}`,`var value = ${i.getByIndices("input_indices")};
var best_index : i32 = 0;`,`if (${i.getByIndices("input_indices")} ${t.selectLastIndex>0?">=":">"} value) {
         value = ${i.getByIndices("input_indices")};
         best_index = i32(last_index);
       }`,"",a.setByOffset("global_idx","best_index")]};e.compute(Br("argMax",{hint:t.cacheKey,inputDependencies:["rank"]},[e.inputs[0]],r,[t.axis],7,t.keepDims),{inputs:[0]})},aa=e=>fe(e)}),io,ao,no,so,Jt,oo,Pd,Aa=D(()=>{X(),te(),Ta(),re(),io=(e,t)=>{let r=e[0],i=e[1],a=e[2],s=e[3],n=e[4],l=e[5];if(n&&l)throw new Error("Attention cannot have both past and attention_bias");if(r.dims.length!==3)throw new Error('Input "input" must have 3 dimensions');let d=r.dims[0],p=r.dims[1],f=r.dims[2];if(a.dims.length!==1)throw new Error('Input "bias" is expected to have 1 dimensions');if(i.dims.length!==2)throw new Error('Input "weights" is expected to have 2 dimensions');if(i.dims[0]!==f)throw new Error("Input 1 dimension 0 should have same length as dimension 2 of input 0");if(a.dims[0]!==i.dims[1])throw new Error('Input "bias" dimension 0 should have same length as dimension 1 of input "weights"');let c=a.dims[0]/3,u=c,y=u;if(t.qkvHiddenSizes.length>0){if(t.qkvHiddenSizes.length!==3)throw new Error("qkv_hidden_sizes attribute should have 3 elements");for(let k of t.qkvHiddenSizes)if(k%t.numHeads!==0)throw new Error("qkv_hidden_sizes should be divisible by num_heads");c=t.qkvHiddenSizes[0],u=t.qkvHiddenSizes[1],y=t.qkvHiddenSizes[2]}let w=p;if(c!==u)throw new Error("qkv_hidden_sizes first element should be same as the second");if(a.dims[0]!==c+u+y)throw new Error('Input "bias" dimension 0 should have same length as sum of Q/K/V hidden sizes');let $=0;if(n){if(u!==y)throw new Error('Input "past" expect k_hidden_size == v_hidden_size');if(n.dims.length!==5)throw new Error('Input "past" must have 5 dimensions');if(n.dims[0]!==2)throw new Error('Input "past" first dimension must be 2');if(n.dims[1]!==d)throw new Error('Input "past" second dimension must be batch_size');if(n.dims[2]!==t.numHeads)throw new Error('Input "past" third dimension must be num_heads');if(n.dims[4]!==u/t.numHeads)throw new Error('Input "past" fifth dimension must be k_hidden_size / num_heads');t.pastPresentShareBuffer||($=n.dims[3])}let b=w+$,x=-1,v=0;if(s)throw new Error("Mask not supported");if(n)throw new Error("past is not supported");if(l){if(l.dims.length!==4)throw new Error('Input "attention_bias" must have 4 dimensions');if(l.dims[0]!==d||l.dims[1]!==t.numHeads||l.dims[2]!==p||l.dims[3]!==b)throw new Error('Expect "attention_bias" shape (batch_size, num_heads, sequence_length, total_sequence_length)')}return{batchSize:d,sequenceLength:p,pastSequenceLength:$,kvSequenceLength:w,totalSequenceLength:b,maxSequenceLength:x,inputHiddenSize:f,hiddenSize:c,vHiddenSize:y,headSize:Math.floor(c/t.numHeads),vHeadSize:Math.floor(y/t.numHeads),numHeads:t.numHeads,isUnidirectional:!1,pastPresentShareBuffer:!1,maskFilterValue:t.maskFilterValue,maskType:v,scale:t.scale,broadcastResPosBias:!1,passPastInKv:!1,qkvFormat:1}},ao=(e,t,r)=>{let i=_e(r),a=64,s=r/i;s<a&&(a=32);let n=Math.ceil(r/i/a),l=[{type:1,data:1/r},{type:12,data:s},{type:12,data:n}],d=Se(e.dataType,i),p=ze(1,i),f=["type"],c=u=>{let y=F("x",e.dataType,e.dims,i),w=ze(e.dataType),$=[{name:"d_inv",type:"f32"},{name:"d_comp",type:"u32"},{name:"elements_per_thread",type:"u32"}];return`
  var<workgroup> thread_max: array<f32, ${a}>;
  var<workgroup> thread_sum: array<f32, ${a}>;
  ${u.registerUniforms($).declareVariables(y)}
  ${u.mainStart([a,1,1])}
    let local_offset = local_idx * uniforms.elements_per_thread;
    let offset = (global_idx / ${a}) * uniforms.d_comp + local_offset;

    var thread_max_vector = ${p}(-3.402823e+38f);
    for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < uniforms.d_comp; i++) {
      thread_max_vector = max(${p}(x[offset + i]), thread_max_vector);
    }
    thread_max[local_idx] = ${(()=>{switch(i){case 1:return"thread_max_vector";case 2:return"max(thread_max_vector.x, thread_max_vector.y)";case 4:return"max(max(thread_max_vector.x, thread_max_vector.y), max(thread_max_vector.z, thread_max_vector.w))";default:throw new Error(`Unsupported components: ${i}`)}})()};
    workgroupBarrier();

    var max_value =  f32(-3.402823e+38f);
    for (var i = 0u; i < ${a}; i++) {
      max_value = max(thread_max[i], max_value);
    }

    var sum_vector = ${p}(0);
    for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < uniforms.d_comp; i++) {
      sum_vector += exp(${p}(x[offset + i]) - max_value);
    }
    thread_sum[local_idx] = ${(()=>{switch(i){case 1:return"sum_vector";case 2:return"sum_vector.x + sum_vector.y";case 4:return"sum_vector.x + sum_vector.y + sum_vector.z + sum_vector.w";default:throw new Error(`Unsupported components: ${i}`)}})()};
    workgroupBarrier();

    var sum: f32 = 0;
    for (var i = 0u; i < ${a}; i++) {
      sum += thread_sum[i];
    }

    if (sum == 0) {
      for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < uniforms.d_comp; i++) {
        x[offset + i] = ${y.type.value}(${w}(uniforms.d_inv));
      }
    } else {
      for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < uniforms.d_comp; i++) {
        var f32input = ${p}(x[offset + i]);
        x[offset + i] = ${y.type.value}(exp(f32input - max_value) / sum);
      }
    }
  }`};return{name:"AttentionProbsSoftmax",shaderCache:{hint:`${a};${d};${i}`,inputDependencies:f},getShaderSource:c,getRunData:()=>({outputs:[],dispatchGroup:{x:t},programUniforms:l})}},no=(e,t,r,i,a,s,n,l)=>{let d=l+s.kvSequenceLength,p=[s.batchSize,s.numHeads,s.sequenceLength,d],f=s.kvNumHeads===void 0&&e>1&&i,c=f?[s.batchSize,s.numHeads,d,s.headSize]:void 0,u=n.scale===0?1/Math.sqrt(s.headSize):n.scale,y=_e(s.headSize),w=s.headSize/y,$=12,b={x:Math.ceil(d/$),y:Math.ceil(s.sequenceLength/$),z:s.batchSize*s.numHeads},x=[{type:12,data:s.sequenceLength},{type:12,data:w},{type:12,data:d},{type:12,data:s.numHeads},{type:1,data:u},{type:12,data:l},{type:12,data:s.kvSequenceLength}],v=f&&i&&O.size(i.dims)>0,k=["type","type"];v&&k.push("type"),a&&k.push("type");let S=[{dims:p,dataType:t.dataType,gpuDataType:0}];f&&S.push({dims:c,dataType:t.dataType,gpuDataType:0});let E=z=>{let T=B("q",t.dataType,t.dims,y),M=B("key",r.dataType,r.dims,y),W=[T,M];if(v){let oe=B("past_key",i.dataType,i.dims,y);W.push(oe)}a&&W.push(B("attention_bias",a.dataType,a.dims));let V=F("output",t.dataType,p),J=[V];f&&J.push(F("present_key",t.dataType,c,y));let ee=ze(1,y),H=[{name:"M",type:"u32"},{name:"K",type:"u32"},{name:"N",type:"u32"},{name:"num_heads",type:"u32"},{name:"alpha",type:"f32"},{name:"past_sequence_length",type:"u32"},{name:"kv_sequence_length",type:"u32"}];return`
  const TILE_SIZE = ${$}u;

  var<workgroup> tileQ: array<${T.type.storage}, ${$*$}>;
  var<workgroup> tileK: array<${T.type.storage}, ${$*$}>;
  ${z.registerUniforms(H).declareVariables(...W,...J)}
  ${z.mainStart([$,$,1])}
    // x holds the N and y holds the M
    let headIdx = workgroup_id.z;
    let m = workgroup_id.y * TILE_SIZE;
    let n = workgroup_id.x * TILE_SIZE;
    let qOffset = uniforms.M * uniforms.K * headIdx + m * uniforms.K;
    ${v&&f?`
    let kOffset = uniforms.kv_sequence_length * uniforms.K * headIdx;
    let pastKeyOffset = uniforms.past_sequence_length * uniforms.K * headIdx;`:`
    let kOffset = uniforms.N * uniforms.K * headIdx + n * uniforms.K;`}
    ${f?"let presentKeyOffset = headIdx * uniforms.N * uniforms.K;":""}
    var value = ${ee}(0);
    for (var w: u32 = 0u; w < uniforms.K; w += TILE_SIZE) {
      if (global_id.y < uniforms.M && w + local_id.x < uniforms.K) {
        tileQ[TILE_SIZE * local_id.y + local_id.x] = q[qOffset + local_id.y * uniforms.K + w + local_id.x];
      }
      if (n + local_id.y < uniforms.N && w + local_id.x < uniforms.K) {
        var idx = TILE_SIZE * local_id.y + local_id.x;
      ${v&&f?`
              if (n + local_id.y < uniforms.past_sequence_length) {
                tileK[idx] = past_key[pastKeyOffset + (n + local_id.y) * uniforms.K + w + local_id.x];
              } else {
                tileK[idx] =
                         key[kOffset + (n + local_id.y - uniforms.past_sequence_length) * uniforms.K + w + local_id.x];
              }`:"tileK[idx] = key[kOffset + local_id.y * uniforms.K + w + local_id.x];"}
      ${f?"present_key[presentKeyOffset + (n + local_id.y) * uniforms.K + w + local_id.x] = tileK[idx];":""}
      }
      workgroupBarrier();

      for (var k: u32 = 0u; k < TILE_SIZE && w+k < uniforms.K; k++) {
        value += ${ee}(tileQ[TILE_SIZE * local_id.y + k] * tileK[TILE_SIZE * local_id.x + k]);
      }

      workgroupBarrier();
    }

    let headOffset = headIdx * uniforms.M * uniforms.N;
    if (global_id.y < uniforms.M && global_id.x < uniforms.N) {
      let outputIdx = headOffset + global_id.y * uniforms.N + global_id.x;
      var sum: f32 = ${(()=>{switch(y){case 1:return"value";case 2:return"value.x + value.y";case 4:return"value.x + value.y + value.z + value.w";default:throw new Error(`Unsupported components: ${y}`)}})()};
        output[outputIdx] = ${V.type.value} (sum * uniforms.alpha) + ${a?"attention_bias[outputIdx]":"0.0"};
    }
  }`};return{name:"AttentionProbs",shaderCache:{hint:`${y};${a!==void 0};${i!==void 0};${e}`,inputDependencies:k},getRunData:()=>({outputs:S,dispatchGroup:b,programUniforms:x}),getShaderSource:E}},so=(e,t,r,i,a,s)=>{let n=s+a.kvSequenceLength,l=a.nReps?a.nReps:1,d=a.vHiddenSize*l,p=a.kvNumHeads==null&&e>1&&i,f=p?[a.batchSize,a.numHeads,n,a.headSize]:void 0,c=[a.batchSize,a.sequenceLength,d],u=12,y={x:Math.ceil(a.vHeadSize/u),y:Math.ceil(a.sequenceLength/u),z:a.batchSize*a.numHeads},w=[{type:12,data:a.sequenceLength},{type:12,data:n},{type:12,data:a.vHeadSize},{type:12,data:a.numHeads},{type:12,data:d},{type:12,data:s},{type:12,data:a.kvSequenceLength}],$=p&&i&&O.size(i.dims)>0,b=["type","type"];$&&b.push("type");let x=[{dims:c,dataType:t.dataType,gpuDataType:0}];p&&x.push({dims:f,dataType:t.dataType,gpuDataType:0});let v=k=>{let S=B("probs",t.dataType,t.dims),E=B("v",r.dataType,r.dims),z=[S,E];$&&z.push(B("past_value",i.dataType,i.dims));let T=[F("output",t.dataType,c)];p&&T.push(F("present_value",t.dataType,f));let M=[{name:"M",type:"u32"},{name:"K",type:"u32"},{name:"N",type:"u32"},{name:"num_heads",type:"u32"},{name:"v_hidden_size",type:"u32"},{name:"past_sequence_length",type:"u32"},{name:"kv_sequence_length",type:"u32"}];return`
  const TILE_SIZE = ${u}u;
  var<workgroup> tileQ: array<${S.type.value}, ${u*u}>;
  var<workgroup> tileK: array<${S.type.value}, ${u*u}>;
  ${k.registerUniforms(M).declareVariables(...z,...T)}
  ${k.mainStart([u,u,1])}
   let headIdx = workgroup_id.z;
   let m = global_id.y;
   let n = global_id.x;

   let offsetA = headIdx * (uniforms.M * uniforms.K) + m * uniforms.K;
   ${$&&p?`
    let pastValueOffset = headIdx * uniforms.N * uniforms.past_sequence_length + n;
    let vOffset = headIdx * uniforms.N * uniforms.kv_sequence_length + n;
      `:`
   let offsetB = headIdx * uniforms.N * uniforms.K + n;
            `}
    ${p?"let presentValueOffset = headIdx * uniforms.N * uniforms.K + n;":""}
   var value = ${S.type.storage}(0);
   for (var w: u32 = 0u; w < uniforms.K; w += TILE_SIZE) {
      if (m < uniforms.M && w + local_id.x < uniforms.K) {
        tileQ[TILE_SIZE * local_id.y + local_id.x] = probs[offsetA + w + local_id.x];
      }
      if (n < uniforms.N && w + local_id.y < uniforms.K) {
        var idx = TILE_SIZE * local_id.y + local_id.x;
        ${$&&p?`
        if (w + local_id.y < uniforms.past_sequence_length) {
          tileK[idx] = past_value[pastValueOffset + (w + local_id.y) * uniforms.N];
        } else {
          tileK[idx] = v[vOffset + (w + local_id.y - uniforms.past_sequence_length) * uniforms.N];
        }
      `:`
        tileK[idx] = v[offsetB + (w + local_id.y) * uniforms.N];
      `}
        ${p?"present_value[presentValueOffset + (w + local_id.y) * uniforms.N] = tileK[idx];":""}
      }
     workgroupBarrier();
     for (var k: u32 = 0u; k < TILE_SIZE && w+k < uniforms.K; k++) {
       value += tileQ[TILE_SIZE * local_id.y + k] * tileK[TILE_SIZE * k + local_id.x];
     }
     workgroupBarrier();
   }

   // we need to transpose output from BNSH_v to BSND_v
   let batchIdx = workgroup_id.z / uniforms.num_heads;
   let currentBatchHeadNumber = workgroup_id.z % uniforms.num_heads;
   if (m < uniforms.M && n < uniforms.N) {
     let outputIdx = batchIdx * uniforms.M * uniforms.v_hidden_size + m * uniforms.v_hidden_size
       + currentBatchHeadNumber * uniforms.N + n;
     output[outputIdx] = value;
   }
  }`};return{name:"AttentionScore",shaderCache:{hint:`${i!==void 0};${e}`,inputDependencies:b},getRunData:()=>({outputs:x,dispatchGroup:y,programUniforms:w}),getShaderSource:v}},Jt=(e,t,r,i,a,s,n,l,d,p,f)=>{let c=Math.min(e.outputCount,1+(n?1:0)+(l?1:0)),u=p.kvNumHeads!==void 0||c>1?p.pastSequenceLength:0,y=u+p.kvSequenceLength,w=d&&O.size(d.dims)>0?d:void 0,$=[t,r];p.kvNumHeads===void 0&&c>1&&n&&O.size(n.dims)>0&&$.push(n),w&&$.push(w);let b=e.compute(no(c,t,r,n,w,p,f,u),{inputs:$,outputs:p.kvNumHeads===void 0&&c>1?[-1,1]:[-1]})[0];e.compute(ao(b,p.batchSize*p.numHeads*p.sequenceLength,y),{inputs:[b],outputs:[]});let x=[b,i];p.kvNumHeads===void 0&&c>1&&l&&O.size(l.dims)>0&&x.push(l),e.compute(so(c,b,i,l,p,u),{inputs:x,outputs:p.kvNumHeads===void 0&&c>1?[0,2]:[0]})},oo=(e,t)=>{let r=[t.batchSize,t.numHeads,t.sequenceLength,t.headSize],i=t.sequenceLength,a=t.inputHiddenSize,s=t.headSize,n=12,l={x:Math.ceil(t.headSize/n),y:Math.ceil(t.sequenceLength/n),z:t.batchSize*t.numHeads},d=[e.inputs[0],e.inputs[1],e.inputs[2]],p=[{type:12,data:i},{type:12,data:a},{type:12,data:s},{type:12,data:t.numHeads},{type:12,data:t.headSize},{type:12,data:t.hiddenSize},{type:12,data:t.hiddenSize+t.hiddenSize+t.vHiddenSize}],f=c=>{let u=F("output_q",d[0].dataType,r),y=F("output_k",d[0].dataType,r),w=F("output_v",d[0].dataType,r),$=B("input",d[0].dataType,d[0].dims),b=B("weight",d[1].dataType,d[1].dims),x=B("bias",d[2].dataType,d[2].dims),v=$.type.storage,k=[{name:"M",type:"u32"},{name:"K",type:"u32"},{name:"N",type:"u32"},{name:"num_heads",type:"u32"},{name:"head_size",type:"u32"},{name:"hidden_size",type:"u32"},{name:"ldb",type:"u32"}];return`
  const TILE_SIZE = ${n}u;
  var<workgroup> tileInput: array<${v}, ${n*n}>;
  var<workgroup> tileWeightQ: array<${v}, ${n*n}>;
  var<workgroup> tileWeightK: array<${v}, ${n*n}>;
  var<workgroup> tileWeightV: array<${v}, ${n*n}>;
  ${c.registerUniforms(k).declareVariables($,b,x,u,y,w)}
  ${c.mainStart([n,n,1])}
    let batchIndex = workgroup_id.z / uniforms.num_heads;
    let headNumber = workgroup_id.z % uniforms.num_heads;
    let m = global_id.y;
    let n = global_id.x;

    let inputOffset = batchIndex * (uniforms.M * uniforms.K) + m * uniforms.K;
    let biasOffsetQ = headNumber * uniforms.head_size;
    let biasOffsetK = uniforms.hidden_size + biasOffsetQ;
    let biasOffsetV = uniforms.hidden_size + biasOffsetK;

    var valueQ = ${v}(0);
    var valueK = ${v}(0);
    var valueV = ${v}(0);
    for (var w: u32 = 0u; w < uniforms.K; w += TILE_SIZE) {
      if (m < uniforms.M && w + local_id.x < uniforms.K) {
        tileInput[TILE_SIZE * local_id.y + local_id.x] = input[inputOffset + w + local_id.x];
      }
      if (n < uniforms.N && w + local_id.y < uniforms.K) {
        let offset = n + (w + local_id.y) * uniforms.ldb;
        tileWeightQ[TILE_SIZE * local_id.y + local_id.x] = weight[biasOffsetQ + offset];
        tileWeightK[TILE_SIZE * local_id.y + local_id.x] = weight[biasOffsetK + offset];
        tileWeightV[TILE_SIZE * local_id.y + local_id.x] = weight[biasOffsetV + offset];
      }
      workgroupBarrier();
      for (var k: u32 = 0u; k<TILE_SIZE && w+k < uniforms.K; k++) {
        let inputTileOffset = TILE_SIZE * local_id.y + k;
        let weightTileOffset = TILE_SIZE * k + local_id.x;
        valueQ += tileInput[inputTileOffset] * tileWeightQ[weightTileOffset];
        valueK += tileInput[inputTileOffset] * tileWeightK[weightTileOffset];
        valueV += tileInput[inputTileOffset] * tileWeightV[weightTileOffset];
      }

      workgroupBarrier();
    }

    let headOffset = (m * uniforms.N + n) % uniforms.head_size;
    valueQ += bias[headOffset + biasOffsetQ];
    valueK += bias[headOffset + biasOffsetK];
    valueV += bias[headOffset + biasOffsetV];

    let offset = workgroup_id.z * uniforms.M * uniforms.N;
    if (m < uniforms.M && n < uniforms.N) {
      let outputIdx = offset + m * uniforms.N + n;
      output_q[outputIdx] = valueQ;
      output_k[outputIdx] = valueK;
      output_v[outputIdx] = valueV;
    }
  }`};return e.compute({name:"AttentionPrepare",shaderCache:{inputDependencies:["type","type","type"]},getRunData:()=>({outputs:[{dims:r,dataType:e.inputs[0].dataType,gpuDataType:0},{dims:r,dataType:e.inputs[0].dataType,gpuDataType:0},{dims:r,dataType:e.inputs[0].dataType,gpuDataType:0}],dispatchGroup:l,programUniforms:p}),getShaderSource:f},{inputs:d,outputs:[-1,-1,-1]})},Pd=(e,t)=>{let r=io(e.inputs,t),[i,a,s]=oo(e,r);return Jt(e,i,a,s,e.inputs[4],void 0,void 0,void 0,e.inputs[5],r,t)}}),uo,lo,po,Dd,Qf=D(()=>{Ke(),X(),te(),be(),re(),uo=(e,t)=>{if(!e||e.length!==5)throw new Error("BatchNormalization requires 5 inputs");let r=(i,a,s)=>{let n=a.length;if(n!==i.length)throw new Error(`${s}: num dimensions != ${n}`);a.forEach((l,d)=>{if(l!==i[d])throw new Error(`${s}: dim[${d}] do not match`)})};if(e[0].dims.length>1){let i=t.format==="NHWC"?t.spatial?e[0].dims.slice(-1):e[0].dims.slice(-1).concat(e[0].dims.slice(1,e[0].dims.length-1)):e[0].dims.slice(1,t.spatial?2:void 0);r(e[1].dims,i,"Invalid input scale"),r(e[2].dims,i,"Invalid input B"),r(e[3].dims,i,"Invalid input mean"),r(e[4].dims,i,"Invalid input var")}else r(e[1].dims,[1],"Invalid input scale"),r(e[2].dims,[1],"Invalid input B"),r(e[3].dims,[1],"Invalid input mean"),r(e[4].dims,[1],"Invalid input var")},lo=(e,t)=>{let{epsilon:r,spatial:i,format:a}=t,s=e[0].dims,n=i?_e(s[s.length-1]):1,l=a==="NHWC"&&s.length>1?n:1,d=O.size(s)/n,p=i,f=p?s.length:s,c=B("x",e[0].dataType,e[0].dims,n),u=B("scale",e[1].dataType,e[1].dims,l),y=B("bias",e[2].dataType,e[2].dims,l),w=B("inputMean",e[3].dataType,e[3].dims,l),$=B("inputVar",e[4].dataType,e[4].dims,l),b=F("y",e[0].dataType,f,n),x=()=>{let k="";if(i)k=`let cOffset = ${s.length===1?"0u":a==="NHWC"?`outputIndices[${s.length-1}] / ${n}`:"outputIndices[1]"};`;else if(a==="NCHW")k=`
            ${b.indicesSet("outputIndices","0","0")}
            let cOffset = ${b.indicesToOffset("outputIndices")};`;else{k=`var cIndices = ${u.type.indices}(0);
                       cIndices[0] = outputIndices[${s.length-1}];`;for(let S=1;S<u.rank;S++)k+=`cIndices[${S}] = outputIndices[${S}];`;k+=`let cOffset = ${u.indicesToOffset("cIndices")};`}return k},v=k=>`
  const epsilon = ${r};
  ${k.registerUniform("outputSize","u32").declareVariables(c,u,y,w,$,b)}
  ${k.mainStart()}
  ${k.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
    var outputIndices = ${b.offsetToIndices(`global_idx * ${n}`)};
    ${x()}
    let scale = ${u.getByOffset("cOffset")};
    let bias = ${y.getByOffset("cOffset")};
    let inputMean = ${w.getByOffset("cOffset")};
    let inputVar = ${$.getByOffset("cOffset")};
    let x = ${c.getByOffset("global_idx")};
    let value = (x - inputMean) * inverseSqrt(inputVar + epsilon) * scale + bias;
    ${b.setByOffset("global_idx","value")}
  }`;return{name:"BatchNormalization",shaderCache:{hint:`${t.epsilon}_${t.format}_${i}_${n}`,inputDependencies:p?["rank","type","type","type","type"]:void 0},getShaderSource:v,getRunData:()=>({outputs:[{dims:e[0].dims,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(d/64)},programUniforms:p?[{type:12,data:d},...L(s)]:[{type:12,data:d}]})}},po=e=>fe(e),Dd=(e,t)=>{let{inputs:r,outputCount:i}=e,a=po({...t,outputCount:i});if(me.webgpu.validateInputContent&&uo(r,a),t.trainingMode)throw new Error("BatchNormalization trainingMode is not supported yet.");e.compute(lo(r,a))}}),ho,co,Ud,Xf=D(()=>{te(),re(),ho=e=>{if(e[0].dims.length!==3)throw new Error("input should have 3 dimensions");if(![320,640,1280].includes(e[0].dims[2]))throw new Error("number of channels should be 320, 640 or 1280");if(e[1].dims.length!==1)throw new Error("bias is expected to have 1 dimensions");if(e[0].dims[2]!==e[1].dims[0])throw new Error("last dimension of input and bias are not the same")},co=e=>{let t=e[0].dims,r=e[0].dims[2],i=O.size(t)/4,a=e[0].dataType,s=B("input",a,t,4),n=B("bias",a,[r],4),l=B("residual",a,t,4),d=F("output",a,t,4);return{name:"BiasAdd",getRunData:()=>({outputs:[{dims:t,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(i/64)}}),getShaderSource:p=>`
  const channels = ${r}u / 4;
  ${p.declareVariables(s,n,l,d)}

  ${p.mainStart()}
    ${p.guardAgainstOutOfBoundsWorkgroupSizes(i)}
    let value = ${s.getByOffset("global_idx")}
      + ${n.getByOffset("global_idx % channels")} + ${l.getByOffset("global_idx")};
    ${d.setByOffset("global_idx","value")}
  }`}},Ud=e=>{ho(e.inputs),e.compute(co(e.inputs))}}),fo,le,Nd,Wd,qd,Vd,Ld,jd,Gd,Fd,Hd,mo,Kd,Yd,Zd,Qd,Zt,Xd,Tr,Jd,ep,tp,rp,ip,ap,np,sp,op,up,lp,dp,pp,hp,cp,fp,Si,mp,na,sa,gp,yp,wp,go,yo,$p,Oa=D(()=>{X(),te(),be(),re(),fo=(e,t,r,i,a,s,n)=>{let l=Math.ceil(t/4),d="";typeof a=="string"?d=`${a}(a)`:d=a("a");let p=B("inputData",r,[l],4),f=F("outputData",i,[l],4),c=[{name:"vec_size",type:"u32"}];return n&&c.push(...n),`
      ${e.registerUniforms(c).declareVariables(p,f)}

  ${s??""}

  ${e.mainStart()}
    ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}

    let a = ${p.getByOffset("global_idx")};
    ${f.setByOffset("global_idx",d)}
  }`},le=(e,t,r,i,a,s=e.dataType,n,l)=>{let d=[{type:12,data:Math.ceil(O.size(e.dims)/4)}];return n&&d.push(...n),{name:t,shaderCache:{hint:a,inputDependencies:["type"]},getShaderSource:p=>fo(p,O.size(e.dims),e.dataType,s,r,i,l),getRunData:p=>({outputs:[{dims:e.dims,dataType:s}],dispatchGroup:{x:Math.ceil(O.size(p[0].dims)/64/4)},programUniforms:d})}},Nd=e=>{e.compute(le(e.inputs[0],"Abs","abs"))},Wd=e=>{e.compute(le(e.inputs[0],"Acos","acos"))},qd=e=>{e.compute(le(e.inputs[0],"Acosh","acosh"))},Vd=e=>{e.compute(le(e.inputs[0],"Asin","asin"))},Ld=e=>{e.compute(le(e.inputs[0],"Asinh","asinh"))},jd=e=>{e.compute(le(e.inputs[0],"Atan","atan"))},Gd=e=>{e.compute(le(e.inputs[0],"Atanh","atanh"))},Fd=e=>fe(e),Hd=(e,t)=>{let r;switch(t.to){case 10:r="vec4<f16>";break;case 1:r="vec4<f32>";break;case 12:r="vec4<u32>";break;case 6:r="vec4<i32>";break;case 9:r="vec4<bool>";break;default:throw new RangeError(`not supported type (specified in attribute 'to' from 'Cast' operator): ${t.to}`)}e.compute(le(e.inputs[0],"Cast",r,void 0,t.cacheKey,t.to))},mo=e=>{let t,r,i=e.length>=2&&e[1].data!==0,a=e.length>=3&&e[2].data!==0;switch(e[0].dataType){case 1:t=i?e[1].getFloat32Array()[0]:-34028234663852886e22,r=a?e[2].getFloat32Array()[0]:34028234663852886e22;break;case 10:t=i?e[1].getUint16Array()[0]:64511,r=a?e[2].getUint16Array()[0]:31743;break;default:throw new Error("Unsupport data type")}return fe({min:t,max:r})},Kd=(e,t)=>{let r=t||mo(e.inputs),i=ze(e.inputs[0].dataType);e.compute(le(e.inputs[0],"Clip",a=>`clamp(${a}, vec4<${i}>(uniforms.min), vec4<${i}>(uniforms.max))`,void 0,r.cacheKey,void 0,[{type:e.inputs[0].dataType,data:r.min},{type:e.inputs[0].dataType,data:r.max}],[{name:"min",type:i},{name:"max",type:i}]),{inputs:[0]})},Yd=e=>{e.compute(le(e.inputs[0],"Ceil","ceil"))},Zd=e=>{e.compute(le(e.inputs[0],"Cos","cos"))},Qd=e=>{e.compute(le(e.inputs[0],"Cosh","cosh"))},Zt=e=>fe(e),Xd=(e,t)=>{let r=ze(e.inputs[0].dataType);e.compute(le(e.inputs[0],"Elu",i=>`elu_vf32(${i})`,`
  const elu_alpha_ = ${r}(${t.alpha});

  fn elu_f32(a: ${r}) -> ${r} {
  return select((exp(a) - 1.0) * elu_alpha_, a, a >= 0.0);
  }

  fn elu_vf32(v: vec4<${r}>) -> vec4<${r}> {
  return vec4(elu_f32(v.x), elu_f32(v.y), elu_f32(v.z), elu_f32(v.w));
  }`,t.cacheKey))},Tr=(e="f32")=>`
const r0: ${e} = 0.3275911;
const r1: ${e} = 0.254829592;
const r2: ${e} = -0.284496736;
const r3: ${e} = 1.421413741;
const r4: ${e} = -1.453152027;
const r5: ${e} = 1.061405429;

fn erf_vf32(v: vec4<${e}>) -> vec4<${e}> {
  let absv = abs(v);
  let x = 1.0 / (1.0 + r0 * absv);
  return sign(v) * (1.0 - ((((r5 * x + r4) * x + r3) * x + r2) * x + r1) * x * exp(-absv * absv));
}`,Jd=e=>{let t=ze(e.inputs[0].dataType);e.compute(le(e.inputs[0],"Erf",r=>`erf_vf32(${r})`,Tr(t)))},ep=e=>{e.compute(le(e.inputs[0],"Exp","exp"))},tp=e=>{e.compute(le(e.inputs[0],"Floor","floor"))},rp=e=>{let t=ze(e.inputs[0].dataType);e.compute(le(e.inputs[0],"Gelu",r=>`0.5 * ${r} * (1.0 + erf_vf32(${r} * 0.7071067811865475))`,Tr(t)))},ip=(e,t)=>{let r=ze(e.inputs[0].dataType);e.compute(le(e.inputs[0],"LeakyRelu",i=>`select(leaky_relu_alpha_ * ${i}, ${i}, ${i} >= vec4<${r}>(0.0))`,`const leaky_relu_alpha_ = ${r}(${t.alpha});`,t.cacheKey))},ap=e=>{e.compute(le(e.inputs[0],"Not",t=>`!${t}`))},np=e=>{e.compute(le(e.inputs[0],"Neg",t=>`-${t}`))},sp=e=>{e.compute(le(e.inputs[0],"Reciprocal",t=>`1.0/${t}`))},op=e=>{let t=ze(e.inputs[0].dataType);e.compute(le(e.inputs[0],"Relu",r=>`select(vec4<${t}>(0.0), ${r}, ${r} > vec4<${t}>(0.0))`))},up=e=>{e.compute(le(e.inputs[0],"Sigmoid",t=>`(1.0 / (1.0 + exp(-${t})))`))},lp=e=>fe(e),dp=(e,t)=>{let r=ze(e.inputs[0].dataType);e.compute(le(e.inputs[0],"HardSigmoid",i=>`max(vec4<${r}>(0.0), min(vec4<${r}>(1.0), ${t.alpha} * ${i} + vec4<${r}>(${t.beta})))`,void 0,t.cacheKey))},pp=e=>{e.compute(le(e.inputs[0],"Sin","sin"))},hp=e=>{e.compute(le(e.inputs[0],"Sinh","sinh"))},cp=e=>{e.compute(le(e.inputs[0],"Sqrt","sqrt"))},fp=e=>{e.compute(le(e.inputs[0],"Tan","tan"))},Si=e=>`sign(${e}) * (1 - exp(-2 * abs(${e}))) / (1 + exp(-2 * abs(${e})))`,mp=e=>{e.compute(le(e.inputs[0],"Tanh",Si))},na=(e="f32")=>`
const fast_gelu_a: ${e} = 0.5;
const fast_gelu_b: ${e} = 0.7978845608028654;
const fast_gelu_c: ${e} = 0.035677408136300125;

fn tanh_v(v: vec4<${e}>) -> vec4<${e}> {
  return ${Si("v")};
}
`,sa=e=>`(fast_gelu_a + fast_gelu_a * tanh_v(${e} * (fast_gelu_c * ${e} * ${e} + fast_gelu_b))) * ${e}`,gp=e=>{let t=ze(e.inputs[0].dataType);e.compute(le(e.inputs[0],"FastGelu",sa,na(t),void 0,e.inputs[0].dataType))},yp=(e,t)=>{let r=ze(e.inputs[0].dataType);return e.compute(le(e.inputs[0],"ThresholdedRelu",i=>`select(vec4<${r}>(0.0), ${i}, ${i} > thresholded_relu_alpha_)`,`const thresholded_relu_alpha_ = vec4<${r}>(${t.alpha});`,t.cacheKey)),0},wp=e=>{e.compute(le(e.inputs[0],"Log","log"))},go=(e,t)=>`
const alpha = vec4<${e}>(${t});
const one = ${e}(1.0);
const zero = ${e}(0.0);

fn quick_gelu_impl(x: vec4<${e}>) -> vec4<${e}> {
  let v = x *alpha;
  var x1 : vec4<${e}>;
  for (var i = 0; i < 4; i = i + 1) {
    if (v[i] >= zero) {
      x1[i] = one / (one + exp(-v[i]));
    } else {
      x1[i] = one - one / (one + exp(v[i]));
    }
  }
  return x * x1;
}
`,yo=e=>`quick_gelu_impl(${e})`,$p=(e,t)=>{let r=ze(e.inputs[0].dataType);e.compute(le(e.inputs[0],"QuickGelu",yo,go(r,t.alpha),t.cacheKey,e.inputs[0].dataType))}}),wo,$o,_p,Jf=D(()=>{te(),re(),Oa(),wo=e=>{if(e[0].dims.length!==3)throw new Error("input should have 3 dimensions");if(![2560,5120,10240].includes(e[0].dims[2]))throw new Error("hidden state should be 2560, 5120 or 10240");if(e[1].dims.length!==1)throw new Error("bias is expected to have 1 dimensions");if(e[0].dims[2]!==e[1].dims[0])throw new Error("last dimension of input and bias are not the same")},$o=e=>{let t=e[0].dims.slice();t[2]=t[2]/2;let r=B("input",e[0].dataType,e[0].dims,4),i=B("bias",e[0].dataType,[e[0].dims[2]],4),a=F("output",e[0].dataType,t,4),s=O.size(t)/4,n=Se(e[0].dataType);return{name:"BiasSplitGelu",getRunData:()=>({outputs:[{dims:t,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(s/64)}}),getShaderSource:l=>`
  const M_SQRT2 = sqrt(2.0);
  const halfChannels = ${e[0].dims[2]/4/2}u;

  ${l.declareVariables(r,i,a)}

  ${Tr(n)}

  ${l.mainStart()}
    ${l.guardAgainstOutOfBoundsWorkgroupSizes(s)}
    let biasIdx = global_idx % halfChannels;
    let batchIndex = global_idx / halfChannels;
    let inputOffset = biasIdx + batchIndex * halfChannels * 2;
    let valueLeft = input[inputOffset] + bias[biasIdx];
    let valueRight = input[inputOffset + halfChannels] + bias[biasIdx + halfChannels];
    let geluRight = valueRight * 0.5 * (erf_vf32(valueRight / M_SQRT2) + 1);

    ${a.setByOffset("global_idx","valueLeft * geluRight")}
  }`}},_p=e=>{wo(e.inputs),e.compute($o(e.inputs))}}),_o,vo,Fe,vp,bp,xp,Sp,kp,Ep,Cp,Tp,Ip,zp,em=D(()=>{X(),te(),re(),_o=(e,t,r,i,a,s,n,l,d,p,f,c)=>{let u,y;typeof l=="string"?u=y=(v,k)=>`${l}((${v}),(${k}))`:typeof l=="function"?u=y=l:(u=l.scalar,y=l.vector);let w=F("outputData",f,i.length,4),$=B("aData",d,t.length,4),b=B("bData",p,r.length,4),x;if(a)if(s){let v=O.size(t)===1,k=O.size(r)===1,S=t.length>0&&t[t.length-1]%4===0,E=r.length>0&&r[r.length-1]%4===0;v||k?x=w.setByOffset("global_idx",y(v?`${$.type.value}(${$.getByOffset("0")}.x)`:$.getByOffset("global_idx"),k?`${b.type.value}(${b.getByOffset("0")}.x)`:b.getByOffset("global_idx"))):x=`
            let outputIndices = ${w.offsetToIndices("global_idx * 4u")};
            let offsetA = ${$.broadcastedIndicesToOffset("outputIndices",w)};
            let offsetB = ${b.broadcastedIndicesToOffset("outputIndices",w)};
            ${w.setByOffset("global_idx",y(n||S?$.getByOffset("offsetA / 4u"):`${$.type.value}(${$.getByOffset("offsetA / 4u")}[offsetA % 4u])`,n||E?b.getByOffset("offsetB / 4u"):`${b.type.value}(${b.getByOffset("offsetB / 4u")}[offsetB % 4u])`))}
          `}else x=w.setByOffset("global_idx",y($.getByOffset("global_idx"),b.getByOffset("global_idx")));else{if(!s)throw new Error("no necessary to use scalar implementation for element-wise binary op implementation.");let v=(k,S,E="")=>{let z=`aData[indexA${S}][componentA${S}]`,T=`bData[indexB${S}][componentB${S}]`;return`
            let outputIndices${S} = ${w.offsetToIndices(`global_idx * 4u + ${S}u`)};
            let offsetA${S} = ${$.broadcastedIndicesToOffset(`outputIndices${S}`,w)};
            let offsetB${S} = ${b.broadcastedIndicesToOffset(`outputIndices${S}`,w)};
            let indexA${S} = offsetA${S} / 4u;
            let indexB${S} = offsetB${S} / 4u;
            let componentA${S} = offsetA${S} % 4u;
            let componentB${S} = offsetB${S} % 4u;
            ${k}[${S}] = ${E}(${u(z,T)});
          `};f===9?x=`
            var data = vec4<u32>(0);
            ${v("data",0,"u32")}
            ${v("data",1,"u32")}
            ${v("data",2,"u32")}
            ${v("data",3,"u32")}
            outputData[global_idx] = dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(data));`:x=`
            ${v("outputData[global_idx]",0)}
            ${v("outputData[global_idx]",1)}
            ${v("outputData[global_idx]",2)}
            ${v("outputData[global_idx]",3)}
          `}return`
        ${e.registerUniform("vec_size","u32").declareVariables($,b,w)}

        ${c??""}

        ${e.mainStart()}
        ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}
        ${x}
      }`},vo=(e,t,r,i,a,s,n=r.dataType)=>{let l=!O.areEqual(r.dims,i.dims),d=r.dims,p=O.size(r.dims),f=!1,c=!1,u=[l];if(l){let y=Pt.calcShape(r.dims,i.dims,!1);if(!y)throw new Error("Can't perform binary op on the given tensors");d=y,p=O.size(d);let w=O.size(r.dims)===1,$=O.size(i.dims)===1,b=r.dims.length>0&&r.dims[r.dims.length-1]%4===0,x=i.dims.length>0&&i.dims[i.dims.length-1]%4===0;u.push(w),u.push($),u.push(b),u.push(x);let v=1;for(let k=1;k<d.length;k++){let S=r.dims[r.dims.length-k]??1,E=i.dims[i.dims.length-k]??1;if(S===E)v*=S;else break}v%4===0?(c=!0,f=!0):(w||$||b||x)&&(f=!0)}else f=!0;return u.push(f),{name:e,shaderCache:{hint:t+u.map(y=>y.toString()).join("_"),inputDependencies:["rank","rank"]},getShaderSource:y=>_o(y,r.dims,i.dims,d,f,l,c,a,r.dataType,i.dataType,n,s),getRunData:()=>({outputs:[{dims:d,dataType:n}],dispatchGroup:{x:Math.ceil(p/64/4)},programUniforms:[{type:12,data:Math.ceil(O.size(d)/4)},...L(r.dims,i.dims,d)]})}},Fe=(e,t,r,i,a,s)=>{e.compute(vo(t,a??"",e.inputs[0],e.inputs[1],r,i,s))},vp=e=>{Fe(e,"Add",(t,r)=>`${t}+${r}`)},bp=e=>{Fe(e,"Div",(t,r)=>`${t}/${r}`)},xp=e=>{Fe(e,"Equal",{scalar:(t,r)=>`u32(${t}==${r})`,vector:(t,r)=>`vec4<u32>(${t}==${r})`},void 0,void 0,9)},Sp=e=>{Fe(e,"Mul",(t,r)=>`${t}*${r}`)},kp=e=>{let t=B("input",e.inputs[0].dataType,e.inputs[0].dims).type.value;Fe(e,"Pow",{scalar:(r,i)=>`pow_custom(${r},${i})`,vector:(r,i)=>`pow_vector_custom(${r},${i})`},`
    fn pow_custom(a : ${t}, b : ${t}) -> ${t} {
      if (b == ${t}(0.0)) {
        return ${t}(1.0);
      } else if (a < ${t}(0.0) && f32(b) != floor(f32(b))) {
        return ${t}(pow(f32(a), f32(b))); // NaN
      }
      return select(sign(a), ${t}(1.0), round(f32(abs(b) % ${t}(2.0))) != 1.0) * ${t}(${t==="i32"?"round":""}(pow(f32(abs(a)), f32(b))));
    }
    fn pow_vector_custom(a : vec4<${t}>, b : vec4<${t}>) -> vec4<${t}> {
      // TODO: implement vectorized pow
      return vec4<${t}>(pow_custom(a.x, b.x), pow_custom(a.y, b.y), pow_custom(a.z, b.z), pow_custom(a.w, b.w));
    }
      `)},Ep=e=>{Fe(e,"Sub",(t,r)=>`${t}-${r}`)},Cp=e=>{Fe(e,"Greater",{scalar:(t,r)=>`u32(${t}>${r})`,vector:(t,r)=>`vec4<u32>(${t}>${r})`},void 0,void 0,9)},Tp=e=>{Fe(e,"Less",{scalar:(t,r)=>`u32(${t}<${r})`,vector:(t,r)=>`vec4<u32>(${t}<${r})`},void 0,void 0,9)},Ip=e=>{Fe(e,"GreaterOrEqual",{scalar:(t,r)=>`u32(${t}>=${r})`,vector:(t,r)=>`vec4<u32>(${t}>=${r})`},void 0,void 0,9)},zp=e=>{Fe(e,"LessOrEqual",{scalar:(t,r)=>`u32(${t}<=${r})`,vector:(t,r)=>`vec4<u32>(${t}<=${r})`},void 0,void 0,9)}}),bo,xo,So,ko,Ap,Op,tm=D(()=>{X(),te(),be(),re(),bo=(e,t)=>{if(!e||e.length<1)throw new Error("too few inputs");let r=0,i=e[r],a=i.dataType,s=i.dims.length;e.forEach((n,l)=>{if(l!==r){if(n.dataType!==a)throw new Error("input tensors should be one type");if(n.dims.length!==s)throw new Error("input tensors should have the same shape");n.dims.forEach((d,p)=>{if(p!==t&&d!==i.dims[p])throw new Error("non concat dimensions must match")})}})},xo=(e,t)=>`
  fn calculateInputIndex(index: u32) -> u32 {
    let sizeInConcatAxis = array<u32, ${e}u>(${t});
    for (var i: u32 = 0u; i < ${e}; i += 1u ) {
      if (index < sizeInConcatAxis[i]) {
        return i;
      }
    }
    return ${e}u;
  }`,So=(e,t)=>{let r=e.length,i=[];for(let a=0;a<r;++a){let s=t.setByOffset("global_idx",e[a].getByIndices("indices"));r===1?i.push(s):a===0?i.push(`if (inputIndex == ${a}u) { ${s} }`):a===r-1?i.push(`else { ${s} }`):i.push(`else if (inputIndex == ${a}) { ${s} }`)}return i.join(`
`)},ko=(e,t,r,i)=>{let a=O.size(r),s=new Array(e.length),n=new Array(e.length),l=0,d=[],p=[],f=[{type:12,data:a}];for(let $=0;$<e.length;++$)l+=e[$].dims[t],s[$]=l,p.push(e[$].dims.length),n[$]=B(`input${$}`,i,p[$]),d.push("rank"),f.push({type:12,data:s[$]});for(let $=0;$<e.length;++$)f.push(...L(e[$].dims));f.push(...L(r));let c=F("output",i,r.length),u=c.indicesGet("indices",t),y=Array.from(Array(s.length).keys()).map($=>`uniforms.sizeInConcatAxis${$}`).join(","),w=$=>`

  ${(()=>{$.registerUniform("outputSize","u32");for(let b=0;b<e.length;b++)$.registerUniform(`sizeInConcatAxis${b}`,"u32");return $.declareVariables(...n,c)})()}

  ${xo(s.length,y)}

  ${$.mainStart()}
    ${$.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}

    var indices = ${c.offsetToIndices("global_idx")};

    let inputIndex = calculateInputIndex(${u});
    if (inputIndex != 0u) {
      let sizeInConcatAxis = array<u32, ${s.length}u>(${y});
      ${u} -= sizeInConcatAxis[inputIndex - 1u];
    }

    ${So(n,c)}
  }`;return{name:"Concat",shaderCache:{hint:`${t}`,inputDependencies:d},getRunData:()=>({outputs:[{dims:r,dataType:i}],dispatchGroup:{x:Math.ceil(a/64)},programUniforms:f}),getShaderSource:w}},Ap=(e,t)=>{let r=e.inputs,i=r[0].dims,a=O.normalizeAxis(t.axis,i.length);bo(r,a);let s=i.slice();s[a]=r.reduce((l,d)=>l+(d.dims.length>a?d.dims[a]:0),0);let n=r.filter(l=>O.size(l.dims)>0);e.compute(ko(n,a,s,r[0].dataType),{inputs:n})},Op=e=>fe({axis:e.axis})}),ct,ft,mt,Ra,yt=D(()=>{X(),te(),ct=(e,t,r="f32")=>{switch(e.activation){case"Relu":return`value = max(value, ${t}(0.0));`;case"Sigmoid":return`value = (${t}(1.0) / (${t}(1.0) + exp(-value)));`;case"Clip":return`value = clamp(value, ${t}(${r}(uniforms.clip_min)), ${t}(${r}(uniforms.clip_max)));`;case"HardSigmoid":return`value = max(${t}(0.0), min(${t}(1.0), ${r}(uniforms.alpha) * value + ${r}(uniforms.beta)));`;case"LeakyRelu":return`value = select(${r}(uniforms.alpha) * value, value, value >= ${t}(0.0));`;case"Tanh":return`let e2x = exp(-2.0 * abs(value));
              value = sign(value) * (1.0 - e2x) / (1.0 + e2x);
        `;case"":return"";default:throw new Error(`Unsupported activation ${e.activation}`)}},ft=(e,t)=>{e.activation==="Clip"?t.push({type:1,data:e.clipMax},{type:1,data:e.clipMin}):e.activation==="HardSigmoid"?t.push({type:1,data:e.alpha},{type:1,data:e.beta}):e.activation==="LeakyRelu"&&t.push({type:1,data:e.alpha})},mt=(e,t)=>{e.activation==="Clip"?t.push({name:"clip_max",type:"f32"},{name:"clip_min",type:"f32"}):e.activation==="HardSigmoid"?t.push({name:"alpha",type:"f32"},{name:"beta",type:"f32"}):e.activation==="LeakyRelu"&&t.push({name:"alpha",type:"f32"})},Ra=e=>{let t=(e==null?void 0:e.activation)||"";if(t==="HardSigmoid"){let[r,i]=(e==null?void 0:e.activation_params)||[.2,.5];return{activation:t,alpha:r,beta:i}}else if(t==="Clip"){let[r,i]=(e==null?void 0:e.activation_params)||[ld,dd];return{activation:t,clipMax:i,clipMin:r}}else if(t==="LeakyRelu"){let[r]=(e==null?void 0:e.activation_params)||[.01];return{activation:t,alpha:r}}return{activation:t}}}),Ae,Ba,Nr=D(()=>{Ae=(e,t)=>{switch(e){case 1:return t;case 2:return`vec2<${t}>`;case 3:return`vec3<${t}>`;case 4:return`vec4<${t}>`;default:throw new Error(`${e}-component is not supported.`)}},Ba=e=>`
      ${e?"value = value + getBiasByOutputCoords(coords);":""}
      `}),Ma,Rp=D(()=>{Ma=e=>`
fn getIndexFromCoords4D(coords : vec4<i32>, shape : vec4<i32>) -> i32 {
  return dot(coords, vec4<i32>(
      shape.y * shape.z * shape.w, shape.z * shape.w, shape.w, 1));
}
fn getOutputIndexFromCoords(coords : vec4<i32>) -> i32 {
  return dot(coords, vec4<i32>(
    i32(${e}.x), i32(${e}.y), i32(${e}.z), 1));
}
`}),Eo,Co,Mr,ki,To,Pr,Io,Pa,Wr=D(()=>{X(),te(),re(),yt(),Nr(),Eo=(e,t)=>e?`
        mm_Asub[inputRow][inputCol] = mm_readA(batch,
          kStart + inputRow,
          globalRowStart / innerElementSize + inputCol${t?", batchIndices":""});
        `:`
        mm_Asub[inputRow][inputCol] = mm_readA(batch,
          globalRow + innerRow,
          kStart / innerElementSize + inputCol${t?", batchIndices":""});
        `,Co=(e,t)=>e?`
        let ACached0 = mm_Asub[k * innerElementSize][localRow];
        let ACached1 = mm_Asub[k * innerElementSize + 1][localRow];
        let ACached2 = mm_Asub[k * innerElementSize + 2][localRow];
        ${t===3?"":"let ACached3 = mm_Asub[k * innerElementSize + 3][localRow];"}
        for (var i = 0; i < rowPerThread; i = i + 1) {
          acc[i] = BCached0 * ACached0[i] + acc[i];
          acc[i] = BCached1 * ACached1[i] + acc[i];
          acc[i] = BCached2 * ACached2[i] + acc[i];
          ${t===3?"":"acc[i] = BCached3 * ACached3[i] + acc[i];"}
        }`:`
        for (var i = 0; i < rowPerThread; i = i + 1) {
          let ACached = mm_Asub[tileRow + i][k];
          acc[i] = BCached0 * ACached.x + acc[i];
          acc[i] = BCached1 * ACached.y + acc[i];
          acc[i] = BCached2 * ACached.z + acc[i];
          ${t===3?"":"acc[i] = BCached3 * ACached.w + acc[i];"}
        }`,Mr=(e,t,r="f32",i,a=!1,s=32,n=!1,l=32)=>{let d=t[1]*e[1],p=t[0]*e[0],f=a?d:s,c=a?s:d,u=f/t[0],y=s/t[1];if(!((a&&u===4&&e[1]===4||!a&&(u===3||u===4))&&f%t[0]===0&&s%t[1]===0&&e[0]===4))throw new Error(`If transposeA ${a} is true, innerElementSize ${u} and workPerThread[1] ${e[1]} must be 4.
      Otherwise, innerElementSize ${u} must be 3 or 4.
  tileAWidth ${f} must be divisible by workgroupSize[0]${t[0]}. tileInner ${s} must be divisible by workgroupSize[1] ${t[1]}. colPerThread ${e[0]} must be 4.`);return`
var<workgroup> mm_Asub: array<array<vec${u}<${r}>, ${f/u}>, ${c}>;
var<workgroup> mm_Bsub: array<array<vec4<${r}>, ${p/e[0]}>, ${s}>;

const rowPerThread = ${e[1]};
const colPerThread = ${e[0]};
const innerElementSize = ${u};
const tileInner = ${s};

@compute @workgroup_size(${t[0]}, ${t[1]}, ${t[2]})
fn main(@builtin(local_invocation_id) localId : vec3<u32>,
        @builtin(global_invocation_id) globalId : vec3<u32>,
        @builtin(workgroup_id) workgroupId : vec3<u32>) {
  let localRow = i32(localId.y);
  let tileRow = localRow * rowPerThread;
  let tileCol = i32(localId.x);

  let globalRow =i32(globalId.y) * rowPerThread;
  let globalCol = i32(globalId.x);
  let batch = ${n?"0":"i32(globalId.z)"};
  ${i?`let batchIndices = ${i.offsetToIndices("u32(batch)")};`:""}
  let globalRowStart = i32(workgroupId.y) * ${d};

  let num_tiles = ${n?`${Math.ceil(l/s)}`:"(uniforms.dim_inner - 1) / tileInner + 1"};
  var kStart = ${n?`i32(globalId.z) * ${l}`:"0"};

  var acc: array<vec4<${r}>, rowPerThread>;

  // Loop over shared dimension.
  let tileRowB = localRow * ${y};
  for (var t = 0; t < num_tiles; t = t + 1) {
      // Load one tile of A into local memory.
      for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
          let inputRow = tileRow + innerRow;
          let inputCol = tileCol;
          ${Eo(a,i)}
      }

      // Load one tile of B into local memory.
      for (var innerRow = 0; innerRow < ${y}; innerRow = innerRow + 1) {
          let inputRow = tileRowB + innerRow;
          let inputCol = tileCol;
          mm_Bsub[inputRow][inputCol] = mm_readB(batch, kStart + inputRow, globalCol${i?", batchIndices":""});
      }
      kStart = kStart + tileInner;
      workgroupBarrier();

      // Compute acc values for a single thread.
      for (var k = 0; k < tileInner / innerElementSize; k = k + 1) {
          let BCached0 = mm_Bsub[k * innerElementSize][tileCol];
          let BCached1 = mm_Bsub[k * innerElementSize + 1][tileCol];
          let BCached2 = mm_Bsub[k * innerElementSize + 2][tileCol];
          ${u===3?"":"let BCached3 = mm_Bsub[k * innerElementSize + 3][tileCol];"}

          ${Co(a,u)}
      }

      workgroupBarrier();
  }

  for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
      mm_write(batch, globalRow + innerRow, globalCol, acc[innerRow]);
  }
}`},ki=(e,t)=>e?`
            mm_Asub[inputRow][inputCol] = mm_readA(batch,
              kStart + inputRow,
              globalRowStart + inputCol${t?", batchIndices":""});
            `:`
            mm_Asub[inputRow][inputCol] = mm_readA(batch,
              globalRowStart + inputRow,
              kStart + inputCol${t?", batchIndices":""});
            `,To=e=>e?"let ACached = mm_Asub[k][tileRow + innerRow];":"let ACached = mm_Asub[tileRow + innerRow][k];",Pr=(e,t,r="f32",i,a=!1,s=32,n=!1,l=32,d=!1)=>{let p=e[1]*t[1],f=e[0]*t[0],c=a?p:s,u=a?s:p;if(!(u%t[1]===0&&c%t[0]===0&&s%t[1]===0))throw new Error(`tileAHight ${u} must be divisible by workgroupSize[1]${t[1]}, tileAWidth ${c} must be divisible by workgroupSize[0]${t[0]}, tileInner ${s} must be divisible by workgroupSize[1]${t[1]}`);let y=u/t[1],w=c/t[0],$=s/t[1],b=d?`
    let localRow = i32(localId.y);
    let localCol = i32(localId.x);
    let globalRowStart = i32(workgroupId.y) * ${p};
    let globalColStart = i32(workgroupId.x) * ${f};

    // Loop over shared dimension.
    for (var t = 0; t < num_tiles; t = t + 1) {
      // Load one tile of A into local memory.
      for (var inputRow = localRow; inputRow < ${u}; inputRow = inputRow + ${t[1]}) {
        for (var inputCol = localCol; inputCol < ${c}; inputCol = inputCol + ${t[0]}) {
          ${ki(a,i)}
        }
      }
      // Load one tile of B into local memory.
      for (var inputRow = localRow; inputRow < ${s}; inputRow = inputRow + ${t[1]}) {
            for (var inputCol = localCol; inputCol < ${f}; inputCol = inputCol + ${t[0]}) {
          mm_Bsub[inputRow][inputCol] = mm_readB(batch,
            kStart + inputRow,
            globalColStart + inputCol${i?", batchIndices":""});
        }
      }
      kStart = kStart + tileInner;
      workgroupBarrier();

      // Compute acc values for a single thread.
      var BCached : array<${r}, colPerThread>;
      for (var k = 0; k < tileInner; k = k + 1) {
        for (var inner = 0; inner < colPerThread; inner = inner + 1) {
          BCached[inner] = mm_Bsub[k][localCol + inner * ${t[0]}];
        }
        for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
          let ACached = ${a?`mm_Asub[k][localRow + innerRow * ${t[1]}];`:`mm_Asub[localRow + innerRow * ${t[1]}][k];`}
          for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
            acc[innerRow][innerCol] = acc[innerRow][innerCol] +
                ACached * BCached[innerCol];
          }
        }
      }
      workgroupBarrier();
    }
    for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
      let gRow = globalRowStart + localRow + innerRow * ${t[1]};
      for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
        let gCol = globalColStart + localCol + innerCol * ${t[0]};
        mm_write(batch, gRow, gCol, acc[innerRow][innerCol]);
      }
    }
    `:`
let tileRow = i32(localId.y) * rowPerThread;
let tileCol = i32(localId.x) * colPerThread;

let globalRow = i32(globalId.y) * rowPerThread;
let globalCol = i32(globalId.x) * colPerThread;
let globalRowStart = i32(workgroupId.y) * ${p};

let tileRowA = i32(localId.y) * ${y};
let tileColA = i32(localId.x) * ${w};
let tileRowB = i32(localId.y) * ${$};
// Loop over shared dimension.
for (var t = 0; t < num_tiles; t = t + 1) {
  // Load one tile of A into local memory.
  for (var innerRow = 0; innerRow < ${y}; innerRow = innerRow + 1) {
    for (var innerCol = 0; innerCol < ${w}; innerCol = innerCol + 1) {
      let inputRow = tileRowA + innerRow;
      let inputCol = tileColA + innerCol;
      ${ki(a,i)}
    }
  }

  // Load one tile of B into local memory.
  for (var innerRow = 0; innerRow < ${$}; innerRow = innerRow + 1) {
    for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
      let inputRow = tileRowB + innerRow;
      let inputCol = tileCol + innerCol;
      mm_Bsub[inputRow][inputCol] = mm_readB(batch,
        kStart + inputRow,
        globalCol + innerCol${i?", batchIndices":""});
    }
  }
  kStart = kStart + tileInner;
  workgroupBarrier();

  // Compute acc values for a single thread.
  var BCached : array<${r}, colPerThread>;
  for (var k = 0; k < tileInner; k = k + 1) {
    for (var inner = 0; inner < colPerThread; inner = inner + 1) {
      BCached[inner] = mm_Bsub[k][tileCol + inner];
    }

    for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
      ${To(a)}
      for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
        acc[innerRow][innerCol] = acc[innerRow][innerCol] + ACached * BCached[innerCol];
      }
    }
  }

  workgroupBarrier();
}

for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
  for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
    mm_write(batch, globalRow + innerRow, globalCol + innerCol,
        acc[innerRow][innerCol]);
  }
}
`;return`
  var<workgroup> mm_Asub : array<array<${r}, ${c}>, ${u}>;
  var<workgroup> mm_Bsub : array<array<${r}, ${f}>, ${s}>;
  const rowPerThread = ${e[1]};
  const colPerThread = ${e[0]};
  const tileInner = ${s};

@compute @workgroup_size(${t[0]}, ${t[1]}, ${t[2]})
fn main(@builtin(local_invocation_id) localId : vec3<u32>,
        @builtin(global_invocation_id) globalId : vec3<u32>,
        @builtin(workgroup_id) workgroupId : vec3<u32>) {
    let batch = ${n?"0":"i32(globalId.z)"};
    ${i?`let batchIndices = ${i.offsetToIndices("u32(batch)")};`:""}
    let num_tiles = ${n?`${Math.ceil(l/s)}`:"(uniforms.dim_inner - 1) / tileInner + 1"};
    var kStart = ${n?`i32(globalId.z) * ${l}`:"0"};

    var acc : array<array<${r}, colPerThread>, rowPerThread>;
    ${b}
  }
`},Io=(e,t,r,i,a,s=!1)=>{let[n,l,d]=a,[p,f,c,u]=i,y=Xt(n,d),w=Xt(l,d),$=Se(i[0].type.tensor),b=()=>{let v=f.rank,k=p.rank,S=`var aIndices: ${f.type.indices};`;for(let E=v-2-1,z=k-1;E>=0;E--,z--)S+=`
aIndices[${E}] = ${k>1?`batchIndices[${z}]`:"batchIndices"};`;return y.forEach(E=>{S+=`
aIndices[${E}] = 0;`}),S+=`
aIndices[${v-2}] = u32(row);
                   aIndices[${v-1}] = u32(colIn);`,S},x=()=>{let v=c.rank,k=p.rank,S=`var bIndices: ${c.type.indices};`;for(let E=v-2-1,z=k-1;E>=0;E--,z--)S+=`
bIndices[${E}] = ${k>1?`batchIndices[${z}]`:"batchIndices"};`;return w.forEach(E=>{S+=`
bIndices[${E}] = 0;`}),S+=`
bIndices[${v-2}] = u32(row);
                   bIndices[${v-1}] = u32(colIn);`,S};return`
    fn mm_readA(batch: i32, row: i32, colIn: i32, batchIndices: ${p.type.indices}) -> ${Ae(e,$)} {
      var value = ${Ae(e,$)}(0.0);
      let col = colIn * ${e};
      if(row < uniforms.dim_a_outer && col < uniforms.dim_inner)
      {
        ${b()}
        value = ${f.getByIndices("aIndices")};
      }
      return value;
    }

    fn mm_readB(batch: i32, row: i32, colIn: i32, batchIndices: ${p.type.indices}) -> ${Ae(e,$)} {
      var value = ${Ae(e,$)}(0.0);
      let col = colIn * ${e};
      if(row < uniforms.dim_inner && col < uniforms.dim_b_outer)
      {
        ${x()}
        value = ${c.getByIndices("bIndices")};
      }
      return value;
    }

    fn mm_write(batch: i32, row: i32, colIn: i32, valueIn: ${Ae(e,$)}) {
      let col = colIn * ${e};
      if (row < uniforms.dim_a_outer && col < uniforms.dim_b_outer) {
        var value = valueIn;
        let coords = vec3<i32>(batch, row, colIn);
        ${t?`value = value + ${s?"bias[colIn]":`${Ae(e,$)}(bias[row])`};`:""}
        ${r}
        ${u.setByIndices("vec3<u32>(coords)","value")}
      }
    }
    `},Pa=(e,t,r,i,a=!1,s)=>{let n=e[0].dims,l=e[1].dims,d=n.slice(0,-2),p=l.slice(0,-2),f=i?i.slice(0,-2):r.slice(0,-2),c=O.size(f),u=n[n.length-2],y=n[n.length-1],w=l[l.length-1],$=y%4===0&&w%4===0,b=u<=8?[4,1,1]:[4,4,1],x=[8,8,1],v=[Math.ceil(w/x[0]/b[0]),Math.ceil(u/x[1]/b[1]),Math.ceil(c/x[2]/b[2])],k=$?4:1,S=[...d,u,y/k],E=S.length,z=[...p,y,w/k],T=z.length,M=[c,u,w/k],W=[{type:6,data:u},{type:6,data:w},{type:6,data:y}];ft(t,W),W.push(...L(f,S,z));let V=["rank","rank"],J=e.length>2;J&&(W.push(...L(e[2].dims)),V.push("rank")),W.push(...L(M));let ee=H=>{let oe=f.length,he=Ia("batchDims",e[0].dataType,oe,1),ie=Se(e[0].dataType),de=B("a",e[0].dataType,E,k),j=B("b",e[1].dataType,T,k),Z=F("result",e[0].dataType,M.length,k),ne=[de,j];if(J){let $e=a?k:1;ne.push(B("bias",e[2].dataType,e[2].dims.length,$e))}let A=[{name:"dim_a_outer",type:"i32"},{name:"dim_b_outer",type:"i32"},{name:"dim_inner",type:"i32"}];mt(t,A);let U=Se(Z.type.tensor),Q=ct(t,Z.type.value,U),ue=Io(k,J,Q,[he,de,j,Z],[d,p,f],a);return`
  ${H.registerUniforms(A).registerInternalVariables(he).declareVariables(...ne,Z)}
  ${ue}
  ${$?Mr(b,x,ie,he):Pr(b,x,ie,he)}
                   `};return{name:"MatMul",shaderCache:{hint:`${b};${t.activation};${$};${a}`,inputDependencies:V},getRunData:()=>({outputs:[{dims:s?s(r):r,dataType:e[0].dataType}],dispatchGroup:{x:v[0],y:v[1],z:v[2]},programUniforms:W}),getShaderSource:ee}}}),zo,Bp,rm=D(()=>{X(),et(),re(),yt(),Nr(),Rp(),Wr(),zo=(e,t,r,i,a=!1,s,n=4,l=4,d=4,p="f32")=>{let f=W=>{switch(W){case 1:return"resData = x[xIndex];";case 3:return`resData = vec3<${p}>(x[xIndex], x[xIndex + 1], x[xIndex + 2]);`;case 4:return"resData = x[xIndex / 4];";default:throw new Error(`innerElementSize ${W} is not supported.`)}},c=W=>{switch(W){case 1:return"return w[row * i32(uniforms.w_shape[3]) + colIn];";case 4:return"return w[row * i32(uniforms.w_shape[3]) / 4 + colIn];";default:throw new Error(`innerElementSize ${W} is not supported.`)}},u=e?`
    let coord = vec4<i32>(batch, xRow, xCol, xCh);
    `:`
    let coord = vec4<i32>(batch, xCh, xRow, xCol);
    `,y=e?`
    let coords = vec4<i32>(
      batch,
      row / outWidth,
      row % outWidth,
      col);
    `:`
    let coords = vec4<i32>(
      batch,
      row,
      col / outWidth,
      col % outWidth);
    `,w=e?"i32(uniforms.x_shape[1])":"i32(uniforms.x_shape[2])",$=e?"i32(uniforms.x_shape[2])":"i32(uniforms.x_shape[3])",b=e?"row":"col",x=e?"col":"row",v=`
    let inChannels = i32(uniforms.w_shape[2]);
    let outWidth = ${e?"i32(uniforms.result_shape[2])":"i32(uniforms.result_shape[3])"};
    let outRow = ${b} / outWidth;
    let outCol = ${b} % outWidth;

    let WRow = ${x} / (i32(uniforms.w_shape[1]) * inChannels);
    let WCol = ${x} / inChannels % i32(uniforms.w_shape[1]);
    let xRow = outRow * uniforms.stride[0] + uniforms.dilation[0] * WRow - uniforms.pad[0];
    let xCol = outCol * uniforms.stride[1] + uniforms.dilation[1] * WCol - uniforms.pad[1];
    let xCh = ${x} % inChannels;
    var resData = ${Ae(n,p)}(0.0);
    // The bounds checking is always needed since we use it to pad zero for
    // the 'same' padding type.
    if (xRow >= 0 && xRow < ${w} && xCol >= 0 && xCol < ${$}) {
      ${u}
      let xIndex = getIndexFromCoords4D(coord, vec4<i32>(uniforms.x_shape));
      ${f(n)}
    }
    return resData;`,k=e?t&&i?`
    let col = colIn * ${n};
    ${v}`:`
    let col = colIn * ${n};
    if (row < uniforms.dim_a_outer && col < uniforms.dim_inner) {
      ${v}
    }
    return ${Ae(n,p)}(0.0);`:i&&r?`
    let col = colIn * ${n};
    ${v}`:`
    let col = colIn * ${n};
    if (row < uniforms.dim_inner && col < uniforms.dim_b_outer) {
      ${v}
    }
    return ${Ae(n,p)}(0.0);`,S=`${c(l)}`,E=Ae(d,p),z=Ae(e?n:l,p),T=Ae(e?l:n,p),M=ct(s,E,p);return`
    fn mm_readA(batch: i32, row : i32, colIn : i32) -> ${z} {
      ${e?k:S}
    }

    fn mm_readB(batch: i32, row : i32, colIn : i32) -> ${T} {
      ${e?S:k}
    }

    fn mm_write(batch: i32, row : i32, colIn : i32, valueIn : ${E}) {
      let col = colIn * ${d};
      if (row < uniforms.dim_a_outer && col < uniforms.dim_b_outer)
      {
      var value = valueIn;
      let outWidth = ${e?"i32(uniforms.result_shape[2])":"i32(uniforms.result_shape[3])"};
      ${y}
      ${Ba(a)}
      ${M}
      setOutputAtCoords(coords[0], coords[1], coords[2], coords[3], value);
      }
    }`},Bp=(e,t,r,i,a,s,n,l,d)=>{let p=t.format==="NHWC",f=p?e[0].dims[3]:e[0].dims[1],c=r[0],u=p?r[2]:r[3],y=p?r[1]:r[2],w=p?r[3]:r[1],$=p&&(f%4===0||f%3===0)&&w%4===0,b=p?w:u*y,x=p?u*y:w,v=[8,8,1],k=i<=8?[4,1,1]:[4,4,1],S=[Math.ceil(b/v[0]/k[0]),Math.ceil(x/v[1]/k[1]),Math.ceil(c/v[2]/k[2])];ce("verbose",()=>`[conv2d_mm_webgpu] dispatch = ${S}`);let E=$?p&&f%4!==0?3:4:1,z=v[1]*k[1],T=v[0]*k[0],M=Math.max(v[0]*E,v[1]),W=i%z===0,V=a%T===0,J=s%M===0,ee=$?[E,4,4]:[1,1,1],H=[{type:6,data:i},{type:6,data:a},{type:6,data:s},{type:6,data:[t.pads[0],t.pads[1]]},{type:6,data:t.strides},{type:6,data:t.dilations}];ft(t,H),H.push(...L(e[0].dims,e[1].dims));let oe=["rank","rank"];n&&(H.push(...L(e[2].dims)),oe.push("rank")),H.push(...L(r));let he=ie=>{let de=[{name:"dim_a_outer",type:"i32"},{name:"dim_b_outer",type:"i32"},{name:"dim_inner",type:"i32"},{name:"pad",type:"i32",length:2},{name:"stride",type:"i32",length:2},{name:"dilation",type:"i32",length:2}];mt(t,de);let j=$?4:1,Z=Se(e[0].dataType),ne=`
      fn setOutputAtIndex(flatIndex : i32, value : ${$?`vec4<${Z}>`:Z}) {
        result[flatIndex] = ${$?`vec4<${Z}>`:Z}(value);
      }
      fn setOutputAtCoords(d0 : i32, d1 : i32, d2 : i32, d3 : i32, value : ${$?`vec4<${Z}>`:Z}) {
        let flatIndex = getOutputIndexFromCoords(vec4<i32>(d0, d1, d2, d3));
        setOutputAtIndex(flatIndex ${$?"/ 4":""}, value);
      }`,A=B("x",e[0].dataType,e[0].dims.length,E===3?1:E),U=B("w",e[1].dataType,e[1].dims.length,j),Q=[A,U],ue=F("result",e[0].dataType,r.length,j);if(n){let $e=B("bias",e[2].dataType,e[2].dims.length,j);Q.push($e),ne+=`
        fn getBiasByOutputCoords(coords : vec4<i32>) -> ${$?`vec4<${Z}>`:Z} {
          return bias[coords.${p?"w":"y"}${$?"/ 4":""}];
        }`}return`
        ${Ma("uniforms.result_strides")}
        //struct Uniforms { xShape : vec4<i32>, wShape : vec4<i32>, outShape : vec4<i32>,
        //  outShapeStrides: vec3<i32>, filterDims : vec2<i32>, pad : vec2<i32>, stride : vec2<i32>,
        //  dilation : vec2<i32>, dimAOuter : i32, dimBOuter : i32, dimInner : i32 };
        ${ie.registerUniforms(de).declareVariables(...Q,ue)}
        ${ne}
        ${zo(p,W,V,J,n,t,ee[0],ee[1],ee[2],Z)}
        ${$?Mr(k,v,Z,void 0,!p,M):Pr(k,v,Z,void 0,!p,M,!1,void 0,l)}`};return{name:"Conv2DMatMul",shaderCache:{hint:`${t.cacheKey};${E};${$};${W};${V};${J};${z};${T};${M}`,inputDependencies:oe},getRunData:()=>({outputs:[{dims:d?d(r):r,dataType:e[0].dataType}],dispatchGroup:{x:S[0],y:S[1],z:S[2]},programUniforms:H}),getShaderSource:he}}}),Ao,Ei,qt,Oo,Ci,Ro,Mp,Pp,im=D(()=>{X(),et(),te(),re(),yt(),Nr(),Ao=e=>{let t=1;for(let r=0;r<e.length;r++)t*=e[r];return t},Ei=e=>typeof e=="number"?[e,e,e]:e,qt=(e,t)=>t<=1?e:e+(e-1)*(t-1),Oo=(e,t,r,i=1)=>{let a=qt(t,i);return Math.floor((e[0]*(r-1)-r+a)/2)},Ci=(e,t,r,i,a)=>{a==null&&(a=Oo(e,t[0],i[0]));let s=[0,0,0,r];for(let n=0;n<3;n++)e[n]+2*a>=t[n]&&(s[n]=Math.trunc((e[n]-t[n]+2*a)/i[n]+1));return s},Ro=(e,t,r,i,a,s,n,l,d,p)=>{let f,c,u,y;if(e==="VALID"&&(e=0),typeof e=="number"){f={top:e,bottom:e,left:e,right:e,front:e,back:e};let w=Ci([t,r,i,1],[l,d,p],1,[a,s,n],e);c=w[0],u=w[1],y=w[2]}else if(Array.isArray(e)){if(!e.every(($,b,x)=>$===x[0]))throw Error(`Unsupported padding parameter: ${e}`);f={top:e[0],bottom:e[1],left:e[2],right:e[3],front:e[4],back:e[5]};let w=Ci([t,r,i,1],[l,d,p],1,[a,s,n],e[0]);c=w[0],u=w[1],y=w[2]}else if(e==="SAME_UPPER"){c=Math.ceil(t/a),u=Math.ceil(r/s),y=Math.ceil(i/n);let w=(c-1)*a+l-t,$=(u-1)*s+d-r,b=(y-1)*n+p-i,x=Math.floor(w/2),v=w-x,k=Math.floor($/2),S=$-k,E=Math.floor(b/2),z=b-E;f={top:k,bottom:S,left:E,right:z,front:x,back:v}}else throw Error(`Unknown padding parameter: ${e}`);return{padInfo:f,outDepth:c,outHeight:u,outWidth:y}},Mp=(e,t,r,i,a,s=!1,n="channelsLast")=>{let l,d,p,f,c;if(n==="channelsLast")[l,d,p,f,c]=e;else if(n==="channelsFirst")[l,c,d,p,f]=e;else throw new Error(`Unknown dataFormat ${n}`);let[u,,y,w,$]=t,[b,x,v]=Ei(r),[k,S,E]=Ei(i),z=qt(y,k),T=qt(w,S),M=qt($,E),{padInfo:W,outDepth:V,outHeight:J,outWidth:ee}=Ro(a,d,p,f,b,x,v,z,T,M),H=s?u*c:u,oe=[0,0,0,0,0];return n==="channelsFirst"?oe=[l,H,V,J,ee]:n==="channelsLast"&&(oe=[l,V,J,ee,H]),{batchSize:l,dataFormat:n,inDepth:d,inHeight:p,inWidth:f,inChannels:c,outDepth:V,outHeight:J,outWidth:ee,outChannels:H,padInfo:W,strideDepth:b,strideHeight:x,strideWidth:v,filterDepth:y,filterHeight:w,filterWidth:$,effectiveFilterDepth:z,effectiveFilterHeight:T,effectiveFilterWidth:M,dilationDepth:k,dilationHeight:S,dilationWidth:E,inShape:e,outShape:oe,filterShape:t}},Pp=(e,t,r,i,a,s)=>{let n=s==="channelsLast";n?e[0].dims[3]:e[0].dims[1];let l=[64,1,1],d={x:r.map((b,x)=>x)},p=[Math.ceil(Ao(d.x.map(b=>r[b]))/l[0]),1,1];ce("verbose",()=>`[conv3d_naive_webgpu] dispatch = ${p}`);let f=1,c=O.size(r),u=[{type:12,data:c},{type:12,data:i},{type:12,data:a},{type:12,data:t.strides},{type:12,data:t.dilations}];ft(t,u),u.push(...L(e[0].dims,e[1].dims));let y=["rank","rank"],w=e.length===3;w&&(u.push(...L(e[2].dims)),y.push("rank")),u.push(...L(r));let $=b=>{let x=[{name:"output_size",type:"u32"},{name:"filter_dims",type:"u32",length:i.length},{name:"pads",type:"u32",length:a.length},{name:"strides",type:"u32",length:t.strides.length},{name:"dilations",type:"u32",length:t.dilations.length}];mt(t,x);let v=1,k=Se(e[0].dataType),S=B("x",e[0].dataType,e[0].dims.length,f),E=B("W",e[1].dataType,e[1].dims.length,v),z=[S,E],T=F("result",e[0].dataType,r.length,v),M="";if(w){let J=B("bias",e[2].dataType,e[2].dims.length,v);z.push(J),M+=`
        fn getBiasByOutputCoords(coords : array<u32, 5>) -> ${k} {
          return bias[${n?G("coords",4,5):G("coords",1,5)}];
        }`}let W=Ae(f,k),V=ct(t,W,k);return`
            ${M}
            fn getX(d0 : u32, d1 : u32, d2 : u32, d3 : u32, d4 : u32) -> f32 {
              let aIndices = array<u32, 5>(d0, d1, d2, d3, d4);
              return ${S.getByIndices("aIndices")};
            }
            fn getW(d0 : u32, d1 : u32, d2 : u32, d3 : u32, d4 : u32) -> f32 {
              let aIndices = array<u32, 5>(d0, d1, d2, d3, d4);
              return ${E.getByIndices("aIndices")};
            }
          ${b.registerUniforms(x).declareVariables(...z,T)}
          ${b.mainStart()}
          ${b.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
              let coords = ${T.offsetToIndices("global_idx")};
              let batch = ${G("coords",0,S.rank)};
              let d2 = ${n?G("coords",S.rank-1,S.rank):G("coords",1,S.rank)};
              let xFRCCorner = vec3<u32>(${n?G("coords",1,S.rank):G("coords",2,S.rank)},
              ${n?G("coords",2,S.rank):G("coords",3,S.rank)},
              ${n?G("coords",3,S.rank):G("coords",4,S.rank)}) * uniforms.strides - uniforms.pads;
              let xFCorner = xFRCCorner.x;
              let xRCorner = xFRCCorner.y;
              let xCCorner = xFRCCorner.z;
              let xShapeY = ${n?G("uniforms.x_shape",1,S.rank):G("uniforms.x_shape",2,S.rank)};
              let xShapeZ = ${n?G("uniforms.x_shape",2,S.rank):G("uniforms.x_shape",3,S.rank)};
              let xShapeW = ${n?G("uniforms.x_shape",3,S.rank):G("uniforms.x_shape",4,S.rank)};
              let xShapeU = ${n?G("uniforms.x_shape",4,S.rank):G("uniforms.x_shape",1,S.rank)};
              let inputDepthNearestVec4 = (xShapeU / 4) * 4;
              let inputDepthVec4Remainder = xShapeU % 4;

              var value = 0.0;
              for (var wF = 0u; wF < uniforms.filter_dims[0]; wF++) {
                let xF = xFCorner + wF * uniforms.dilations[0];
                if (xF < 0 || xF >= xShapeY) {
                  continue;
                }

                for (var wR = 0u; wR < uniforms.filter_dims[1]; wR++) {
                  let xR = xRCorner + wR * uniforms.dilations[1];
                  if (xR < 0 || xR >= xShapeZ) {
                    continue;
                  }

                  for (var wC = 0u; wC < uniforms.filter_dims[2]; wC++) {
                    let xC = xCCorner + wC * uniforms.dilations[2];
                    if (xC < 0 || xC >= xShapeW) {
                      continue;
                    }

                    for (var d1 = 0u; d1 < inputDepthNearestVec4; d1 += 4) {
                      ${n?`let xValues = vec4<f32>(
                               getX(batch, xF, xR, xC, d1),
                               getX(batch, xF, xR, xC, d1 + 1),
                               getX(batch, xF, xR, xC, d1 + 2),
                               getX(batch, xF, xR, xC, d1 + 3));
                            `:`let xValues = vec4<f32>(
                               getX(batch, d1, xF, xR, xC),
                               getX(batch, d1 + 1, xF, xR, xC),
                               getX(batch, d1 + 2, xF, xR, xC),
                               getX(batch, d1 + 3, xF, xR, xC));
                            `}
                            let wValues = vec4<f32>(
                              getW(d2, d1, wF, wR, wC),
                              getW(d2, d1 + 1, wF, wR, wC),
                              getW(d2, d1 + 2, wF, wR, wC),
                              getW(d2, d1 + 3, wF, wR, wC));
                      value += dot(xValues, wValues);
                    }
                    if (inputDepthVec4Remainder == 1) {
                        ${n?`value += getX(batch, xF, xR, xC, inputDepthNearestVec4)
                          * getW(d2, inputDepthNearestVec4, wF, wR, wC);`:`value += getX(batch, inputDepthNearestVec4, xF, xR, xC)
                          * getW(d2, inputDepthNearestVec4, wF, wR, wC);`}
                    } else if (inputDepthVec4Remainder == 2) {
                      ${n?`let xValues = vec2<f32>(
                        getX(batch, xF, xR, xC, inputDepthNearestVec4),
                        getX(batch, xF, xR, xC, inputDepthNearestVec4 + 1));
                      `:`let xValues = vec2<f32>(
                        getX(batch, inputDepthNearestVec4, xF, xR, xC),
                        getX(batch, inputDepthNearestVec4 + 1, xF, xR, xC));
                    `}
                    let wValues = vec2<f32>(
                      getW(d2, inputDepthNearestVec4, wF, wR, wC),
                      getW(d2, inputDepthNearestVec4 + 1, wF, wR, wC));
                      value += dot(xValues, wValues);
                    } else if (inputDepthVec4Remainder == 3) {
                      ${n?`let xValues = vec3<f32>(
                        getX(batch, xF, xR, xC, inputDepthNearestVec4),
                        getX(batch, xF, xR, xC, inputDepthNearestVec4 + 1),
                        getX(batch, xF, xR, xC, inputDepthNearestVec4 + 2));
                      `:`let xValues = vec3<f32>(
                        getX(batch, inputDepthNearestVec4, xF, xR, xC),
                        getX(batch, inputDepthNearestVec4 + 1, xF, xR, xC),
                        getX(batch, inputDepthNearestVec4 + 2, xF, xR, xC));
                    `}
                    let wValues = vec3<f32>(
                      getW(d2, inputDepthNearestVec4, wF, wR, wC),
                      getW(d2, inputDepthNearestVec4 + 1, wF, wR, wC),
                      getW(d2, inputDepthNearestVec4 + 2, wF, wR, wC));
                      value += dot(xValues, wValues);
                    }
                  }
                }
              }
              ${w?"value = value + getBiasByOutputCoords(coords)":""};
              ${V}
              result[global_idx] = f32(value);
          }`};return{name:"Conv3DNaive",shaderCache:{hint:`${t.cacheKey};${n};${f};${w}`,inputDependencies:y},getRunData:()=>({outputs:[{dims:r,dataType:e[0].dataType}],dispatchGroup:{x:p[0],y:p[1],z:p[2]},programUniforms:u}),getShaderSource:$}}}),Dp,Up,am=D(()=>{X(),te(),re(),yt(),Dp=(e,t,r,i)=>{let a=e.length>2,s=a?"value += b[output_channel];":"",n=e[0].dims,l=e[1].dims,d=t.format==="NHWC",p=d?r[3]:r[1],f=p/t.group,c=d&&f>=4?_e(p):1,u=O.size(r)/c,y=[{type:12,data:u},{type:12,data:t.dilations},{type:12,data:[t.strides[0],t.strides[1]]},{type:12,data:[t.pads[0],t.pads[1]]},{type:12,data:f}];ft(t,y),y.push(...L(n,[l[0],l[1],l[2],l[3]/c]));let w=a?["rank","rank","rank"]:["rank","rank"];y.push(...L([r[0],r[1],r[2],r[3]/c]));let $=b=>{let x=F("output",e[0].dataType,r.length,c),v=Se(x.type.tensor),k=ct(t,x.type.value,v),S=B("x",e[0].dataType,n.length),E=B("w",e[1].dataType,l.length,c),z=[S,E];a&&z.push(B("b",e[2].dataType,e[2].dims,c));let T=[{name:"output_size",type:"u32"},{name:"dilations",type:"u32",length:t.dilations.length},{name:"strides",type:"u32",length:2},{name:"pads",type:"u32",length:2},{name:"output_channels_per_group",type:"u32"}];mt(t,T);let M=d?`
      for (var wHeight: u32 = 0u; wHeight < uniforms.w_shape[0]; wHeight++) {
        let xHeight = xRCCorner.x + wHeight * uniforms.dilations[0];

        if (xHeight < 0u || xHeight >= uniforms.x_shape[1]) {
          continue;
        }

        for (var wWidth: u32 = 0u; wWidth < uniforms.w_shape[1]; wWidth++) {
          let xWidth = xRCCorner.y + wWidth * uniforms.dilations[1];
          if (xWidth < 0u || xWidth >= uniforms.x_shape[2]) {
            continue;
          }

          for (var wInChannel: u32 = 0u; wInChannel < uniforms.w_shape[2]; wInChannel++) {
            let input_channel = in_channel_offset + wInChannel;
            let xVal = ${S.get("batch","xHeight","xWidth","input_channel")};
            let wVal = ${E.get("wHeight","wWidth","wInChannel","output_channel")};
            value += xVal * wVal;
          }
        }
      }
      `:`
      for (var wInChannel: u32 = 0u; wInChannel < uniforms.w_shape[1]; wInChannel++) {
        let input_channel = in_channel_offset + wInChannel;
        for (var wHeight: u32 = 0u; wHeight < uniforms.w_shape[2]; wHeight++) {
          let xHeight = xRCCorner.x + wHeight * uniforms.dilations[0];

          if (xHeight < 0u || xHeight >= uniforms.x_shape[2]) {
            continue;
          }

          for (var wWidth: u32 = 0u; wWidth < uniforms.w_shape[3]; wWidth++) {
            let xWidth = xRCCorner.y + wWidth * uniforms.dilations[1];
            if (xWidth < 0u || xWidth >= uniforms.x_shape[3]) {
              continue;
            }

            let xVal = ${S.get("batch","input_channel","xHeight","xWidth")};
            let wVal = ${E.get("output_channel","wInChannel","wHeight","wWidth")};
            value += xVal * wVal;
          }
        }
      }
      `;return`
  ${b.registerUniforms(T).declareVariables(...z,x)}

  ${b.mainStart()}
    ${b.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let outputIndices = ${x.offsetToIndices("global_idx")};
    let batch: u32 = outputIndices[0];
    let output_channel: u32 = outputIndices[${d?3:1}];
    let xRCCorner: vec2<u32> = vec2<u32>(outputIndices[${d?1:2}], outputIndices[${d?2:3}]) * uniforms.strides - uniforms.pads;
    let group_id: u32 = output_channel * ${c} / uniforms.output_channels_per_group;
    var in_channel_offset = group_id * uniforms.w_shape[${d?2:1}];

    var value: ${x.type.value} = ${x.type.value}(0);
    ${M}
    ${s}
    ${k}
    ${x.setByOffset("global_idx","value")}
  }`};return{name:"GroupedConv",shaderCache:{hint:`${t.cacheKey}_${c}`,inputDependencies:w},getRunData:()=>({outputs:[{dims:i?i(r):r,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(u/64)},programUniforms:y}),getShaderSource:$}},Up=(e,t,r,i)=>{let a=e.length>2,s=_e(r[3]),n=_e(r[2]),l=O.size(r)/s/n,d=[e[0].dims[0],e[0].dims[1],e[0].dims[2],e[0].dims[3]/s],p=[e[1].dims[0],e[1].dims[1],e[1].dims[2],e[1].dims[3]/s],f=[r[0],r[1],r[2],r[3]/s],c=[{type:12,data:l},{type:6,data:[t.strides[0],t.strides[1]]},{type:6,data:[t.pads[0],t.pads[1]]}];ft(t,c),c.push(...L(d,p,f));let u=(n-1)*t.strides[1]+p[1],y=w=>{let $=F("output",e[0].dataType,f.length,s),b=Se($.type.tensor),x=ct(t,$.type.value,b),v=B("x",e[0].dataType,d.length,s),k=B("w",e[1].dataType,p.length,s),S=[v,k];a&&S.push(B("b",e[2].dataType,e[2].dims,s));let E=a?"value += b[output_channel];":"",z=[{name:"output_size",type:"u32"},{name:"strides",type:"i32",length:2},{name:"pads",type:"i32",length:2}];return mt(t,z),`
  ${w.registerUniforms(z).declareVariables(...S,$)}
  ${w.mainStart()}
    ${w.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let width0 = uniforms.output_shape[3];
    let output_channel = global_idx % width0;
    var index1 = global_idx / width0;
    let width1 = uniforms.output_shape[2] / ${n}u;
    let col = (index1 % width1) * ${n}u;
    index1 = index1 / width1;
    let row = index1 % uniforms.output_shape[1];
    let batch = index1 / uniforms.output_shape[1];

    let x_corner = vec2<i32>(i32(row), i32(col)) * uniforms.strides - uniforms.pads;

    var x_vals: array<${v.type.value}, ${u}>;
    var values: array<${$.type.value}, ${n}>;
    let input_channel = output_channel;
    // Use constant instead of uniform can give better performance for w's height/width.
    for (var w_height: u32 = 0u; w_height < ${p[0]}; w_height++) {
      let x_height = x_corner.x + i32(w_height);
      if (x_height >= 0 && u32(x_height) < uniforms.x_shape[1]) {
        for (var i = 0; i < ${u}; i++) {
          let x_width = x_corner.y + i;
          if (x_width >= 0 && u32(x_width) < uniforms.x_shape[2]) {
            x_vals[i] = ${v.get("batch","u32(x_height)","u32(x_width)","input_channel")};
          } else {
            x_vals[i] = ${v.type.value}(0);
          }
        }
        for (var w_width: u32 = 0u; w_width < ${p[1]}; w_width++) {
          let w_val = ${k.get("w_height","w_width","0","output_channel")};
          for (var i = 0u; i < ${n}u; i++) {
            values[i] = fma(x_vals[i * u32(uniforms.strides[1]) + w_width], w_val, values[i]);
          }
        }
      }
    }

    for (var i = 0u; i < ${n}u; i++) {
      var value = values[i];
      ${E}
      ${x}
      ${$.set("batch","row","col + i","output_channel","value")};
    }
  }`};return{name:"GroupedConv-Vectorize",shaderCache:{hint:`${t.cacheKey};${s};${n};${u};${p[0]};${p[1]}`,inputDependencies:a?["rank","rank","type"]:["rank","rank"]},getRunData:()=>({outputs:[{dims:i?i(r):r,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(l/64)},programUniforms:c}),getShaderSource:y}}}),oa,Bo,Np,Wp=D(()=>{X(),te(),Wr(),re(),yt(),oa=(e,t,r,i,a=!1,s)=>{let n=e[0].dims,l=e[1].dims,d=n[n.length-2],p=l[l.length-1],f=n[n.length-1],c=_e(p),u=_e(f),y=_e(d),w=O.size(r)/c/y,$=e.length>2,b=i?i.slice(0,-2):r.slice(0,-2),x=[O.size(b),d,p],v=[{type:12,data:w},{type:12,data:d},{type:12,data:p},{type:12,data:f}];ft(t,v),v.push(...L(b,n,l)),$&&v.push(...L(e[2].dims)),v.push(...L(x));let k=S=>{let E=Ia("batch_dims",e[0].dataType,b.length),z=B("a",e[0].dataType,n.length,u),T=B("b",e[1].dataType,l.length,c),M=F("output",e[0].dataType,x.length,c),W=Se(M.type.tensor),V=ct(t,M.type.value,W),J=[z,T],ee="";if($){let ne=a?c:1;J.push(B("bias",e[2].dataType,e[2].dims.length,ne)),ee=`${a?`value += bias[col / ${ne}];`:`value += ${M.type.value}(bias[row + i]);`}`}let H=n.slice(0,-2),oe=l.slice(0,-2),he=Xt(H,b),ie=Xt(oe,b),de=[{name:"output_size",type:"u32"},{name:"M",type:"u32"},{name:"N",type:"u32"},{name:"K",type:"u32"}];mt(t,de);let j=(ne,A)=>{let U=ne.rank,Q=ne.name;if(U===2)return`var ${Q}_indices = ${ne.type.indices}(0u, 0u);`;let ue=E.rank,$e=`var ${Q}_indices: ${ne.type.indices};`;for(let ve=U-2-1,it=ue-1;ve>=0;ve--,it--)$e+=`
${Q}_indices[${ve}] = ${ue>1?`batch_indices[${it}]`:"batch_indices"};`;return A.forEach(ve=>{$e+=`
${Q}_indices[${ve}] = 0;`}),$e+=`${Q}_indices[${U-2}] = 0u;
                     ${Q}_indices[${U-1}] = 0u;`,$e},Z=()=>{let ne=`var a_data: ${z.type.value};`;for(let A=0;A<u;A++)ne+=`
              let b_data${A} = b[(b_offset + (k + ${A}) * uniforms.N + col) / ${c}];`;for(let A=0;A<y;A++){ne+=`a_data = a[(a_offset + (row + ${A}) * uniforms.K + k) / ${u}];`;for(let U=0;U<u;U++)ne+=`
            values[${A}] = fma(${T.type.value}(a_data${u===1?"":`[${U}]`}), b_data${U}, values[${A}]);
`}return ne};return`
  ${S.registerUniforms(de).registerInternalVariables(E).declareVariables(...J,M)}
  ${S.mainStart()}
    ${S.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let col = (global_idx % (uniforms.N / ${c})) * ${c};
    var index1 = global_idx / (uniforms.N / ${c});
    let stride1 = uniforms.M / ${y};
    let row = (index1 % stride1) * ${y};
    let batch = index1 / stride1;

    ${r.length===2?"":`let batch_indices = ${E.offsetToIndices("batch")};`}
    ${j(z,he)}
    let a_offset = ${z.indicesToOffset("a_indices")};
    ${j(T,ie)}
    let b_offset = ${T.indicesToOffset("b_indices")};
    var values: array<${M.type.value}, ${y}>;
    for (var k: u32 = 0u; k < uniforms.K; k = k + ${u}) {
      ${Z()}
    }
    for (var i = 0u; i < ${y}u; i++) {
      var value = values[i];
      ${ee}
      ${V}
      let cur_indices = ${M.type.indices}(batch, row + i, col);
      let offset = ${M.indicesToOffset("cur_indices")};
      ${M.setByOffset(`offset / ${c}`,"value")};
    }
  }
  `};return{name:"MatMulNaive",shaderCache:{hint:`${t.activation};${c};${u};${y};${a}`,inputDependencies:$?["rank","rank","rank"]:["rank","rank"]},getRunData:()=>({outputs:[{dims:s?s(r):r,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(w/64)},programUniforms:v}),getShaderSource:k}},Bo=e=>{if(!e||e.length!==2)throw new Error("MatMul requires 2 inputs.");if(e[0].dims[e[0].dims.length-1]!==e[1].dims[e[1].dims.length-2])throw new Error("shared dimension does not match.")},Np=e=>{Bo(e.inputs);let t=Pt.calcShape(e.inputs[0].dims,e.inputs[1].dims,!0);if(!t)throw new Error("Can't use matmul on the given tensors");let r=t[t.length-1],i=e.inputs[0].dims[e.inputs[0].dims.length-1];r<8&&i<8?e.compute(oa(e.inputs,{activation:""},t)):e.compute(Pa(e.inputs,{activation:""},t))}}),Mo,vr,Po,br,ua,Ti,Do,Uo,la,nm=D(()=>{te(),rm(),im(),Wr(),am(),yt(),Wp(),gt(),Mo=(e,t,r,i,a,s)=>{let n=e[0],l=e.slice(s?1:2,s?3:4),d=l.length,p=t[0],f=t.slice(2).map((u,y)=>u+(u-1)*(r[y]-1)),c=l.map((u,y)=>u+i[y]+i[y+d]).map((u,y)=>Math.floor((u-f[y]+a[y])/a[y]));return c.splice(0,0,n),c.splice(s?3:1,0,p),c},vr=[2,3,1,0],Po=(e,t)=>{if(!e||e.length!==2&&e.length!==3)throw new Error("Conv requires 2 or 3 inputs");if(e[0].dims.length>5)throw new Error("greater than 5D is not supported");if(e[0].dims.length!==e[1].dims.length)throw new Error("filter does not have same dimension as input");let r=e[0].dims[t.format==="NHWC"?e[0].dims.length-1:1],i=e[1].dims[1]*t.group;if(r!==i)throw new Error("FILTER_IN_CHANNEL should be equal to DATA_CHANNEL");if(e.length===3&&(e[2].dims.length!==1||e[1].dims[0]!==e[2].dims[0]))throw new Error("invalid bias");let a=e[0].dims.length-2;if(t.dilations.length!==a)throw new Error(`dilations should be ${a}D`);if(t.strides.length!==a)throw new Error(`strides should be ${a}D`);if(t.pads.length!==a*2)throw new Error(`pads should be ${a*2}D`);if(t.kernelShape.length!==0&&t.kernelShape.length!==e[1].dims.length-2)throw new Error("invalid kernel shape")},br=(e,t)=>{let r=e.kernelShape.slice();r.length<t[1].dims.length-2&&r.push(...Array(t[1].dims.length-2-r.length).fill(0));for(let s=2;s<t[1].dims.length;++s)r[s-2]===0&&(r[s-2]=t[1].dims[s]);let i=e.pads.slice();Rr.adjustPadsBasedOnAutoPad(t[0].dims,e.strides,e.dilations,r,i,e.format==="NHWC",e.autoPad);let a=Object.assign({},e);return Object.assign(a,{kernelShape:r,pads:i}),a},ua=e=>{let t=Ra(e),r=e.format,i=["NOTSET","VALID","SAME_UPPER","SAME_LOWER"][e.auto_pad],a=e.dilations,s=e.group,n=e.kernel_shape,l=e.pads,d=e.strides,p=e.w_is_const();return{autoPad:i,format:r,dilations:a,group:s,kernelShape:n,pads:l,strides:d,wIsConst:p,...t,cacheKey:`${e.format};${t.activation};`}},Ti=(e,t,r,i)=>{let a=r.format==="NHWC",s=Mo(t[0].dims,t[1].dims,r.dilations,r.pads,r.strides,a);if(r.group!==1){let z=[t[0]];if(a){let T=e.kernelCustomData.wT??e.compute(De(t[1],vr),{inputs:[1],outputs:[r.wIsConst?-2:-1]})[0];r.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=T),z.push(T)}else z.push(t[1]);t.length===3&&z.push(t[2]),!e.adapterInfo.isArchitecture("ampere")&&a&&t[1].dims[0]===r.group&&t[1].dims[1]===1&&r.dilations[0]===1&&r.dilations[1]===1?e.compute(Up(z,r,s,i),{inputs:z}):e.compute(Dp(z,r,s,i),{inputs:z});return}let n=t.length===3,l=t[0].dims[a?1:2],d=t[0].dims[a?2:3],p=t[0].dims[a?3:1],f=t[1].dims[2],c=t[1].dims[3],u=s[a?1:2],y=s[a?2:3],w=s[a?3:1],$=a&&f===l&&c===d&&r.pads[0]===0&&r.pads[1]===0;if($||f===1&&c===1&&r.dilations[0]===1&&r.dilations[1]===1&&r.strides[0]===1&&r.strides[1]===1&&r.pads[0]===0&&r.pads[1]===0){let z=s[0],T,M,W,V=[];if(a){let H=e.kernelCustomData.wT??e.compute(De(t[1],vr),{inputs:[1],outputs:[r.wIsConst?-2:-1]})[0];if(r.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=H),$){let oe=l*d*p;T=t[0].reshape([1,z,oe]),M=H.reshape([1,oe,w]),W=[1,z,w]}else T=t[0].reshape([z,l*d,p]),M=H.reshape([1,p,w]),W=[z,u*y,w];V.push(T),V.push(M)}else T=t[0].reshape([z,p,l*d]),M=t[1].reshape([1,w,p]),W=[z,w,u*y],V.push(M),V.push(T);n&&V.push(t[2]);let J=W[2],ee=V[0].dims[V[0].dims.length-1];J<8&&ee<8?e.compute(oa(V,r,s,W,a,i),{inputs:V}):e.compute(Pa(V,r,s,W,a,i),{inputs:V});return}let b=!0,x=e.kernelCustomData.wT??e.compute(De(t[1],vr),{inputs:[1],outputs:[r.wIsConst?-2:-1]})[0];r.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=x);let v=[t[0],x];n&&v.push(t[2]);let k=a?u*y:w,S=a?w:u*y,E=f*c*p;e.compute(Bp(v,r,s,k,S,E,n,b,i),{inputs:v})},Do=(e,t)=>{let r=t.format==="NHWC",i=[e.inputs[0].reshape(r?[e.inputs[0].dims[0],1,e.inputs[0].dims[1],e.inputs[0].dims[2]]:[e.inputs[0].dims[0],e.inputs[0].dims[1],1,e.inputs[0].dims[2]]),e.inputs[1].reshape([e.inputs[1].dims[0],e.inputs[1].dims[1],1,e.inputs[1].dims[2]])];e.inputs.length===3&&i.push(e.inputs[2]);let a=[0,t.pads[0],0,t.pads[1]],s=[1].concat(t.strides),n=[1].concat(t.dilations),l=[1].concat(t.kernelShape),d=br({...t,pads:a,strides:s,dilations:n,kernelShape:l},i);Ti(e,i,d,p=>r?[p[0],p[2],p[3]]:[p[0],p[1],p[3]])},Uo=(e,t,r)=>{let i=r.format==="NHWC"?"channelsLast":"channelsFirst",a=br(r,t),s=r.autoPad==="NOTSET"?r.pads:r.autoPad,n=Mp(t[0].dims,t[1].dims,r.strides,r.dilations,s,!1,i);e.compute(Pp(t,a,n.outShape,[n.filterDepth,n.filterHeight,n.filterWidth],[n.padInfo.front,n.padInfo.top,n.padInfo.left],i))},la=(e,t)=>{if(Po(e.inputs,t),e.inputs[0].dims.length===3)Do(e,t);else if(e.inputs[0].dims.length===5)Uo(e,e.inputs,t);else{let r=br(t,e.inputs);Ti(e,e.inputs,r)}}}),No,qp,sm=D(()=>{X(),et(),re(),yt(),Nr(),Rp(),Wr(),No=(e,t=!1,r,i,a=4)=>{let s=b=>{switch(b){case 1:return"return w[getIndexFromCoords4D(coord, vec4<i32>(uniforms.w_shape))];";case 4:return`
            let coord1 = vec4<i32>(coordX, coordY, col + 1, rowInner);
            let coord2 = vec4<i32>(coordX, coordY, col + 2, rowInner);
            let coord3 = vec4<i32>(coordX, coordY, col + 3, rowInner);
            let v0 = w[getIndexFromCoords4D(coord, vec4<i32>(uniforms.w_shape))];
            let v1 = w[getIndexFromCoords4D(coord1, vec4<i32>(uniforms.w_shape))];
            let v2 = w[getIndexFromCoords4D(coord2, vec4<i32>(uniforms.w_shape))];
            let v3 = w[getIndexFromCoords4D(coord3, vec4<i32>(uniforms.w_shape))];
            return ${i}(v0, v1, v2, v3);
            `;default:throw new Error(`innerElementSize ${b} is not supported.`)}},n=e?`
      let coord = vec4<i32>(batch, iXR, iXC, xCh);
      `:`
      let coord = vec4<i32>(batch, xCh, iXR, iXC);
      `,l=e?`
    let coords = vec4<i32>(
      batch,
      row / outWidth,
      row % outWidth,
      col);
    `:`
    let coords = vec4<i32>(
      batch,
      row,
      col / outWidth,
      col % outWidth);
    `,d=e?"i32(uniforms.x_shape[1])":"i32(uniforms.x_shape[2])",p=e?"i32(uniforms.x_shape[2])":"i32(uniforms.x_shape[3])",f=e?"row":"col",c=e?"col":"row",u=`
      let inChannels = ${e?"i32(uniforms.x_shape[3])":"i32(uniforms.x_shape[1])"};
      let outWidth = ${e?"i32(uniforms.result_shape[2])":"i32(uniforms.result_shape[3])"};
      let outRow = ${f} / outWidth;
      let outCol = ${f} % outWidth;

      let WRow = ${c} / (uniforms.filter_dims[1] * inChannels);
      let WCol = ${c} / inChannels % uniforms.filter_dims[1];
      let xR = f32(outRow - uniforms.pads[0] + uniforms.dilations[0] * WRow) / f32(uniforms.strides[0]);
      let xC = f32(outCol - uniforms.pads[1] + uniforms.dilations[1] * WCol) / f32(uniforms.strides[1]);
      if (xR < 0.0 || xR >= f32(${d}) || fract(xR) > 0.0) {
        return ${i}(0.0);
      }
      if (xC < 0.0 || xC >= f32(${p}) || fract(xC) > 0.0) {
        return ${i}(0.0);
      }
      let iXR = i32(xR);
      let iXC = i32(xC);
      let xCh = ${c} % inChannels;
      ${n}
      return x[getIndexFromCoords4D(coord, vec4<i32>(uniforms.x_shape))/${a}];`,y=e?`
      let col = colIn * ${a};
      if (row < uniforms.dim_a_outer && col < uniforms.dim_inner) {
        ${u}
      }
      return ${i}(0.0);`:`
      let col = colIn * ${a};
      if (row < uniforms.dim_inner && col < uniforms.dim_b_outer) {
        ${u}
      }
      return ${i}(0.0);`,w=`
      let col = colIn * ${a};
      let inChannels = ${e?"i32(uniforms.x_shape[3])":"i32(uniforms.x_shape[1])"};
      let coordX = uniforms.filter_dims[0] - 1 - row / (uniforms.filter_dims[1] * inChannels);
      let coordY = uniforms.filter_dims[1] - 1 - (row / inChannels) % uniforms.filter_dims[1];
      if (${e?"row < uniforms.dim_inner && col < uniforms.dim_b_outer":"row < uniforms.dim_inner && col < uniforms.dim_a_outer"}  && coordX >= 0 && coordY >= 0) {
        let rowInner = row % inChannels;
        let coord = vec4<i32>(coordX, coordY, col, rowInner);
        ${s(a)}
      }
      return ${i}(0.0);
      `,$=ct(r,i);return`
  fn mm_readA(batch: i32, row : i32, colIn : i32) -> ${i} {
    ${e?y:w}
  }

  fn mm_readB(batch: i32, row : i32, colIn : i32) -> ${i} {
    ${e?w:y}
  }

  fn mm_write(batch: i32, row : i32, colIn : i32, valueInput : ${i}) {
    let col = colIn * ${a};
    if (row < uniforms.dim_a_outer && col < uniforms.dim_b_outer) {
      var value = valueInput;
      let outWidth = ${e?"i32(uniforms.result_shape[2])":"i32(uniforms.result_shape[3])"};
      ${l}
      ${Ba(t)}
      ${$}
      result[getIndexFromCoords4D(coords, vec4<i32>(uniforms.result_shape))/${a}] = value;
    }
  }`},qp=(e,t,r,i,a,s,n,l)=>{let d=t.format==="NHWC",p=d?e[0].dims[3]:e[0].dims[1],f=r[0],c=d?r[2]:r[3],u=d?r[1]:r[2],y=d?r[3]:r[1],w=d&&p%4===0&&p%3&&y%4===0,$=d?y:c*u,b=d?c*u:y,x=[8,8,1],v=i<=8?[4,1,1]:[4,4,1],k=[Math.ceil($/x[0]/v[0]),Math.ceil(b/x[1]/v[1]),Math.ceil(f/x[2]/v[2])];ce("verbose",()=>`[conv_backprop_mm_webgpu] dispatch = ${k}`);let S=w?4:1,E=Math.max(x[0]*S,x[1]),z=w?4:1,T=[t.kernelShape[d?1:2],t.kernelShape[d?2:3]],M=[T[0]+(t.dilations[0]<=1?0:(T[0]-1)*(t.dilations[0]-1)),T[1]+(t.dilations[1]<=1?0:(T[1]-1)*(t.dilations[1]-1))],W=[M[0]-1-Math.floor((t.pads[0]+t.pads[2])/2),M[1]-1-Math.floor((t.pads[1]+t.pads[3])/2)],V=[{type:6,data:i},{type:6,data:a},{type:6,data:s},{type:6,data:t.strides},{type:6,data:t.dilations},{type:6,data:T},{type:6,data:W}];ft(t,V),V.push(...L(e[0].dims,e[1].dims));let J=["rank","rank"];n&&(V.push(...L(e[2].dims)),J.push("rank")),V.push(...L(r));let ee=H=>{let oe=B("x",e[0].dataType,e[0].dims.length,z),he=B("w",e[1].dataType,e[1].dims.length,1),ie=F("result",e[0].dataType,r.length,z),de=[oe,he],j="";if(n){let A=B("bias",e[2].dataType,e[2].dims.length,z);de.push(A),j+=`
          fn getBiasByOutputCoords(coords : vec4<i32>) -> ${A.type.value} {
            return bias[coords.${d?"w":"y"}${w?"/ 4":""}];
          }`}let Z=[{name:"dim_a_outer",type:"i32"},{name:"dim_b_outer",type:"i32"},{name:"dim_inner",type:"i32"},{name:"strides",type:"i32",length:2},{name:"dilations",type:"i32",length:2},{name:"filter_dims",type:"i32",length:T.length},{name:"pads",type:"i32",length:W.length}];mt(t,Z);let ne=Se(e[0].dataType,1);if(ne!=="f16"&&ne!=="f32")throw new Error(`elemType ${ne} is not supported.`);return`
        ${Ma("uniforms.result_strides")}
        ${H.registerUniforms(Z).declareVariables(...de,ie)};
        ${j}
        ${No(d,n,t,oe.type.value,S)}
        ${w?Mr(v,x,ne,void 0,!d,E):Pr(v,x,ne,void 0,!d,E,!1,void 0,l)}`};return{name:"Conv2DTransposeMatMul",shaderCache:{hint:`${t.cacheKey};${v};${x};${w}`,inputDependencies:J},getRunData:()=>({outputs:[{dims:r,dataType:e[0].dataType}],dispatchGroup:{x:k[0],y:k[1],z:k[2]},programUniforms:V}),getShaderSource:ee}}}),Wo,da,om=D(()=>{X(),et(),te(),re(),Wo=(e,t,r,i,a,s=!1,n,l,d=!1)=>{let p=d?1:2,f=d?2:3,c=d?3:1,u=s?2:1,y=`
  fn setOutputAtIndex(flatIndex : u32, value : ${s?`vec4<${n}>`:n}) {
    result[flatIndex] = ${s?`vec4<${n}>`:n}(value);
  }`;i&&(y+=`
    fn getBiasByOutputCoords(coords : vec4<u32>) -> ${s?`vec4<${n}>`:n} {
      return bias[coords.${d?"w":"y"}${s?"/ 4":""}];
    }`);let w=s?4:1,$=B("W",t[1].dataType,t[1].dims.length,w),b=B("Dy",t[0].dataType,t[0].dims.length,w),x=[b,$];i&&x.push(B("bias",t[2].dataType,[r[c]].length,w));let v=F("result",t[0].dataType,r.length,w),k=`{
        let batch: u32 = ${a?"global_id.z":"workgroup_id.z"} / uniforms.result_shape[1];
        let r = ${a?"global_id.z":"workgroup_id.z"} % uniforms.result_shape[1];
        let c = ${a?"global_id.y":"workgroup_id.y"} * ${u};
        let d1: u32 = ${a?"global_id.x":"workgroup_id.x"} * 4;

        let dyCorner = vec2<i32>(i32(r), i32(c)) - vec2<i32>(uniforms.pads);

        // Convolve dy(?, ?, d2) with w(:, :, d1, d2) to compute dx(xR, xC, d1).
        // ? = to be determined. : = across all values in that axis.
        var dotProd: array<vec4<${n}>, ${u}>;
        for (var i = 0; i < ${u}; i++) {
          dotProd[i] = vec4<${n}>(0.0);
        }
        for (var wR: u32 = 0; wR < uniforms.filter_dims[0]; wR = wR + 1) {
          var dyR = (${n}(dyCorner.x) + ${n}(wR)) / ${n}(uniforms.strides.x);
          let wRPerm = uniforms.filter_dims[0] - 1 - wR;
          if (dyR < 0.0 || dyR >= ${n}(uniforms.Dy_shape[1]) ||
              fract(dyR) > 0.0 || wRPerm < 0) {
            continue;
          }
          let idyR: u32 = u32(dyR);

          for (var wC: u32 = 0; wC < uniforms.filter_dims[1]; wC = wC + 1) {
            let dyC = (${n}(dyCorner.y) + ${n}(wC)) / ${n}(uniforms.strides.y);
            let dyC2 = (${n}(dyCorner.y) + 1.0 + ${n}(wC)) / ${n}(uniforms.strides.y);
            let wCPerm = uniforms.filter_dims[1] - 1 - wC;
            if (wCPerm < 0) {
              continue;
            }
            var bDyCVal = true;
            var bDyCVal2 = true;
            if (dyC < 0.0 || dyC >= ${n}(uniforms.Dy_shape[2]) ||
                fract(dyC) > 0.0) {
              bDyCVal = false;
            }
            if (dyC2 < 0.0 || dyC2 >= ${n}(uniforms.Dy_shape[2]) ||
                fract(dyC2) > 0.0) {
              bDyCVal2 = false;
            }

            let idyC: u32 = u32(dyC);
            let idyC2: u32 = u32(dyC2);
            if (bDyCVal && bDyCVal2) {
              let d2Length = uniforms.Dy_shape[3];
              for (var d2 :u32 = 0; d2 < d2Length; d2 = d2 + 4) {
                let wValue0 = ${$.get("u32(wRPerm)","u32(wCPerm)","d1","d2")};
                let wValue1 = ${$.get("u32(wRPerm)","u32(wCPerm)","d1 + 1","d2")};
                let wValue2 = ${$.get("u32(wRPerm)","u32(wCPerm)","d1 + 2","d2")};
                let wValue3 = ${$.get("u32(wRPerm)","u32(wCPerm)","d1 + 3","d2")};

                var xValue = ${b.get("batch","idyR","idyC","d2")};
                let tmpval = vec4<${n}>(dot(xValue, wValue0),
                                      dot(xValue, wValue1),
                                      dot(xValue, wValue2),
                                      dot(xValue, wValue3));
                dotProd[0] = dotProd[0] + tmpval;

                xValue =  ${b.get("batch","idyR","idyC2","d2")};

                dotProd[1] = dotProd[1] + vec4<${n}>(dot(xValue, wValue0),
                                                    dot(xValue, wValue1),
                                                    dot(xValue, wValue2),
                                                    dot(xValue, wValue3));
              }
            } else if (bDyCVal) {
              let d2Length = uniforms.Dy_shape[${c}];
              for (var d2: u32 = 0; d2 < d2Length; d2 = d2 + 4) {
                let wValue0 = ${$.get("u32(wRPerm)","u32(wCPerm)","d1","d2")};
                let wValue1 = ${$.get("u32(wRPerm)","u32(wCPerm)","d1 + 1","d2")};
                let wValue2 = ${$.get("u32(wRPerm)","u32(wCPerm)","d1 + 2","d2")};
                let wValue3 = ${$.get("u32(wRPerm)","u32(wCPerm)","d1 + 3","d2")};

                var xValue = ${b.get("batch","idyR","idyC","d2")};
                let tmpval = vec4<${n}>(dot(xValue, wValue0),
                                      dot(xValue, wValue1),
                                      dot(xValue, wValue2),
                                      dot(xValue, wValue3));
                dotProd[0] = dotProd[0] + tmpval;
              }
            } else if (bDyCVal2) {
              let d2Length = uniforms.Dy_shape[3];
              for (var d2: u32 = 0; d2 < d2Length; d2 = d2 + 4) {
                let wValue0 = ${$.get("u32(wRPerm)","u32(wCPerm)","d1","d2")};
                let wValue1 = ${$.get("u32(wRPerm)","u32(wCPerm)","d1 + 1","d2")};
                let wValue2 = ${$.get("u32(wRPerm)","u32(wCPerm)","d1 + 2","d2")};
                let wValue3 = ${$.get("u32(wRPerm)","u32(wCPerm)","d1 + 3","d2")};

                var xValue = ${b.get("batch","idyR","idyC2","d2")};
                let tmpval = vec4<${n}>(dot(xValue, wValue0),
                                      dot(xValue, wValue1),
                                      dot(xValue, wValue2),
                                      dot(xValue, wValue3));
                dotProd[1] = dotProd[1] + tmpval;
              }
            }
          }
        }

        for (var i: u32 = 0; i < ${u}; i = i + 1) {
          let value = dotProd[i] + ${i?"bias[c+i]":`vec4<${n}>(0.0)`};
          ${v.set("batch","r","c + i","d1","value")};
        }
      }`,S=`
          let outputIndices = ${v.offsetToIndices("global_idx")};
          let batch = ${v.indicesGet("outputIndices",0)};
          let d1 = ${v.indicesGet("outputIndices",c)};
          let r = ${v.indicesGet("outputIndices",p)};
          let c = ${v.indicesGet("outputIndices",f)};
          let dyCorner = vec2<i32>(i32(r), i32(c)) - uniforms.pads;
          let dyRCorner = dyCorner.x;
          let dyCCorner = dyCorner.y;
          let groupId = d1 / uniforms.output_channels_per_group;
          let wOutChannel = d1 - groupId * uniforms.output_channels_per_group;
          // Convolve dy(?, ?, d2) with w(:, :, d1, d2) to compute dx(xR, xC, d1).
          // ? = to be determined. : = across all values in that axis.
          var dotProd = ${n}(0.0);
          for (var wR: u32 = 0; wR < uniforms.effective_filter_dims.x; wR = wR + 1) {
            if (wR % uniforms.dilations.x != 0) {
              continue;
            }
            let dyR = (${n}(dyRCorner) + ${n}(wR)) / ${n}(uniforms.strides[0]);
            let wRPerm = uniforms.filter_dims.x - 1 - wR / uniforms.dilations.x;
            if (dyR < 0.0 || dyR >= ${n}(uniforms.Dy_shape[${p}]) || fract(dyR) > 0.0 ||
                wRPerm < 0) {
              continue;
            }
            let idyR: u32 = u32(dyR);

            for (var wC: u32 = 0; wC < uniforms.effective_filter_dims.y; wC = wC + 1) {
              if (wC % uniforms.dilations.y != 0) {
                continue;
              }
              let dyC = (${n}(dyCCorner) + ${n}(wC)) / ${n}(uniforms.strides.y);
              let wCPerm = uniforms.filter_dims.y - 1 - wC / uniforms.dilations.y;
              if (dyC < 0.0 || dyC >= ${n}(uniforms.Dy_shape[${f}]) ||
                  fract(dyC) > 0.0 || wCPerm < 0) {
                continue;
              }
              let idyC: u32 = u32(dyC);
              var inputChannel = groupId * uniforms.input_channels_per_group;
              for (var d2: u32 = 0; d2 < uniforms.input_channels_per_group; d2 = d2 + 1) {
                let xValue = ${d?b.get("batch","idyR","idyC","inputChannel"):b.get("batch","inputChannel","idyR","idyC")};
                let wValue = ${$.get("inputChannel","wOutChannel","u32(wRPerm)","u32(wCPerm)")};
                dotProd = dotProd + xValue * wValue;
                inputChannel = inputChannel + 1;
              }
            }
          }
          let value = dotProd + ${i?"bias[d1]":`${n}(0.0)`};
          ${v.setByOffset("global_idx","value")};
        `;return`
  ${e.registerUniforms(l).declareVariables(...x,v)}
  ${y}

    ${e.mainStart()}
    ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")};
  ${s?k:S}}`},da=(e,t,r)=>{let i=e.length>2,a=t.outputShape,s=O.size(a),n=[Math.ceil(s/64),1,1];ce("verbose",()=>`[conv2d_backprop_webgpu] dispatch = ${n}`);let l=t.format==="NHWC",d=["rank","rank"],p=[t.strides[0],t.strides[1]],f=[t.kernelShape[l?1:2],t.kernelShape[l?2:3]],c=[t.dilations[0],t.dilations[1]],u=[f[0]+(t.dilations[0]<=1?0:(t.kernelShape[l?1:2]-1)*(t.dilations[0]-1)),f[1]+(t.dilations[1]<=1?0:(t.kernelShape[l?2:3]-1)*(t.dilations[1]-1))],y=[u[0]-1-Math.floor((t.pads[0]+t.pads[2])/2),u[1]-1-Math.floor(t.pads[1]+t.pads[3])/2],w=!1,$=t.group,b=e[1].dims,x=b[0]/$,v=b[1],k=[{type:12,data:s},{type:12,data:p},{type:12,data:f},{type:12,data:c},{type:12,data:u},{type:6,data:y},{type:12,data:x},{type:12,data:v},...L(e[0].dims,e[1].dims)];i&&(k.push(...L(e[2].dims)),d.push("rank")),k.push(...L(a));let S=n[1]===1&&n[2]===1,E=z=>{let T=[{name:"output_size",type:"u32"},{name:"strides",type:"u32",length:p.length},{name:"filter_dims",type:"u32",length:f.length},{name:"dilations",type:"u32",length:f.length},{name:"effective_filter_dims",type:"u32",length:u.length},{name:"pads",type:"i32",length:y.length},{name:"input_channels_per_group",type:"u32"},{name:"output_channels_per_group",type:"u32"}],M=Se(e[0].dataType);return`${Wo(z,e,a,i,S,w,M,T,l)}`};return{name:"ConvTranspose2D",shaderCache:{hint:`${t.cacheKey};`,inputDependencies:d},getRunData:()=>({dispatchGroup:{x:n[0],y:n[1],z:n[2]},outputs:[{dims:r?r(a):a,dataType:e[0].dataType}],programUniforms:k}),getShaderSource:E}}}),qo,Vo,Lo,Ii,Vp,jo,Go,Fo,Ho,Lp,um=D(()=>{sm(),om(),yt(),gt(),qo=(e,t,r,i,a,s)=>(e-1)*t+r+(i-1)*a+1-s,Vo=(e,t,r,i,a)=>{let s=Math.floor(e/2);t==="SAME_UPPER"?(r[i]=s,r[a]=e-s):t==="SAME_LOWER"&&(r[i]=e-s,r[a]=s)},Lo=(e,t,r,i,a,s,n,l,d,p)=>{let f=e.length-2,c=p.length===0;d.length<f&&d.push(...Array(f-d.length).fill(0));let u=e[0],y=t[l?3:1]*a;for(let w=0,$=e.length-f-(l?1:0);w<f;++w,++$){let b=e[$],x=c?b*n[w]:p[w],v=qo(b,n[w],s[w],t[$],r[w],x);Vo(v,i,s,w,w+f),c&&p.push(n[w]*(b-1)+d[w]+(t[$]-1)*r[w]+1-s[w]-s[w+f])}p.splice(0,0,u),p.splice(l?3:1,0,y)},Ii=(e,t)=>{let r=e.kernelShape.slice();if(e.kernelShape.length===0||e.kernelShape.reduce((c,u)=>c*u,1)===0){r.length=0;for(let c=2;c<t[1].dims.length;++c)r.push(t[1].dims[c])}let i=e.format==="NHWC";r.splice(0,0,t[1].dims[0]),r.splice(i?3:1,0,t[1].dims[1]);let a=e.pads.slice(),s=e.outputShape.slice(),n=e.outputPadding.slice(),l=t[0].dims,d=e.dilations.slice();if(d.reduce((c,u)=>c+u,0)===0){let c=t[0].dims.length-2;d=new Array(c).fill(1)}let p=e.strides.slice();if(p.reduce((c,u)=>c+u,0)===0){let c=t[0].dims.length-2;p=new Array(c).fill(1)}Lo(l,r,d,e.autoPad,e.group,a,p,i,n,s);let f=Object.assign({},e);return Object.assign(f,{kernelShape:r,pads:a,outputPadding:n,outputShape:s,dilations:d,strides:p}),f},Vp=e=>{let t=Ra(e),r=e.format,i=["NOTSET","VALID","SAME_UPPER","SAME_LOWER"][typeof e.autoPad>"u"?0:e.autoPad],a=e.dilations,s=e.group,n=e.kernelShape,l=e.pads,d=e.strides,p=e.wIsConst(),f=e.outputPadding,c=e.outputShape;return{autoPad:i,format:r,dilations:a,group:s,kernelShape:n,outputPadding:f,outputShape:c,pads:l,strides:d,wIsConst:p,...t,cacheKey:`${e.format};${t.activation};`}},jo=(e,t)=>{if(!e||e.length!==2&&e.length!==3)throw new Error("Conv requires 2 or 3 inputs");if(e[0].dims.length!==4&&e[0].dims.length!==3)throw new Error("currently only support 2-dimensional conv");if(e[0].dims.length!==e[1].dims.length)throw new Error("filter does not have same dimension as input");let r=e[0].dims[t.format==="NHWC"?e[0].dims.length-1:1],i=e[1].dims[0];if(r!==i)throw new Error("FILTER_IN_CHANNEL should be equal to DATA_CHANNEL");let a=e[1].dims[1]*t.group;if(e.length===3&&(e[2].dims.length!==1||e[2].dims[0]!==a))throw new Error("invalid bias");let s=e[0].dims.length-2;if(t.dilations.reduce((n,l)=>n+l,0)>0&&t.dilations.length!==s)throw new Error(`dilations should be ${s}D`);if(t.strides.reduce((n,l)=>n+l,0)>0&&t.strides.length!==s)throw new Error(`strides should be ${s}D`);if(t.pads.reduce((n,l)=>n+l,0)>0&&t.pads.length!==s*2)throw new Error(`pads should be ${s*2}D`);if(t.outputPadding.length!==s&&t.outputPadding.length!==0)throw new Error(`output_padding should be ${s}D`);if(t.kernelShape.reduce((n,l)=>n+l,0)>0&&t.kernelShape.length!==0&&t.kernelShape.length!==e[1].dims.length-2)throw new Error("invalid kernel shape");if(t.outputShape.length!==0&&t.outputShape.length!==e[0].dims.length-2)throw new Error("invalid output shape")},Go=[2,3,1,0],Fo=(e,t,r)=>{let i=Ii(r,t),a=r.format==="NHWC",s=i.outputShape,n=s[a?3:1],l=t[0].dims[a?3:1];if(i.group!==1||n===1&&l===1){e.compute(da(t,i));return}let d=s[a?1:2],p=s[a?2:3],f=t[1].dims[2],c=t[1].dims[3],u=a?d*p:n,y=a?n:d*p,w=f*c*l,$=!0,b=e.kernelCustomData.wT??e.compute(De(t[1],Go),{inputs:[1],outputs:[r.wIsConst?-2:-1]})[0];r.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=b);let x=[t[0],b],v=t.length===3;v&&(!a&&t[2].dims.length===1?x.push(t[2].reshape([t[2].dims[0],1,1])):x.push(t[2])),e.compute(qp(x,i,s,u,y,w,v,$),{inputs:x})},Ho=(e,t)=>{let r=t.format==="NHWC",i=[e.inputs[0].reshape(r?[e.inputs[0].dims[0],1,e.inputs[0].dims[1],e.inputs[0].dims[2]]:[e.inputs[0].dims[0],e.inputs[0].dims[1],1,e.inputs[0].dims[2]]),e.inputs[1].reshape([e.inputs[1].dims[0],e.inputs[1].dims[1],1,e.inputs[1].dims[2]])];e.inputs.length===3&&i.push(e.inputs[2]);let a=t.kernelShape;(a.length===0||a[0]===0)&&(a=[e.inputs[1].dims[2]]);let s=t.dilations;(s.length===0||s[0]===0)&&(s=[1]);let n=t.strides;(n.length===0||n[0]===0)&&(n=[1]);let l=t.pads;l.length===0&&(l=[0,0]),l=[0,l[0],0,l[1]],n=[1].concat(n),s=[1].concat(s),a=[1].concat(a);let d=Ii({...t,pads:l,strides:n,dilations:s,kernelShape:a},i);e.compute(da(i,d,p=>r?[p[0],p[2],p[3]]:[p[0],p[1],p[3]]))},Lp=(e,t)=>{jo(e.inputs,t),e.inputs[0].dims.length===3?Ho(e,t):Fo(e,e.inputs,t)}}),Ko,jp,Gp,lm=D(()=>{X(),te(),be(),re(),Ko=(e,t,r,i)=>{let a=O.size(t),s=t.length,n=B("input",e,s),l=F("output",e,s),d=r.dataType===6?r.getInt32Array()[0]:Number(r.getBigInt64Array()[0]),p=O.normalizeAxis(d,s),f=c=>{let u=` i32(${n.indicesGet("inputIndices","uniforms.axis")}) `,y=G("uniforms.input_shape","uniforms.axis",s),w=i.reverse?u+(i.exclusive?" + 1":""):"0",$=i.reverse?y:u+(i.exclusive?"":" + 1");return`
                ${c.registerUniform("outputSize","u32").registerUniform("axis","u32").declareVariables(n,l)}
                ${c.mainStart()}
                  ${c.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
                  var inputIndices = ${l.offsetToIndices("global_idx")};
                  var sum = ${l.type.value}(0);
                  let first : i32 = ${w};
                  let last : i32 = ${$};
                  for (var i : i32 = first; i < last; i++) {
                    ${n.indicesSet("inputIndices","uniforms.axis","u32(i)")};
                    sum = sum + ${n.getByIndices("inputIndices")};
                  }
                  ${l.setByOffset("global_idx","sum")};
                }`};return{name:"CumSum",shaderCache:{hint:i.cacheKey,inputDependencies:["rank"]},getRunData:()=>({outputs:[{dims:t,dataType:e}],dispatchGroup:{x:Math.ceil(a/64)},programUniforms:[{type:12,data:a},{type:12,data:p},...L(t,t)]}),getShaderSource:f}},jp=(e,t)=>{let r=e.inputs[0].dims,i=e.inputs[0].dataType,a=e.inputs[1];e.compute(Ko(i,r,a,t),{inputs:[0]})},Gp=e=>{let t=e.exclusive===1,r=e.reverse===1;return fe({exclusive:t,reverse:r})}}),Yo,Zo,Qo,Fp,Hp,dm=D(()=>{X(),te(),be(),re(),Yo=e=>{if(!e||e.length!==1)throw new Error("DepthToSpace requires 1 input.");if(e[0].dims.length!==4)throw new Error("DepthToSpace requires 4D input.")},Zo=(e,t,r,i)=>{let a=[];a.push(`fn perm(i: ${i.type.indices}) -> ${r.type.indices} {
    var a: ${r.type.indices};`);for(let s=0;s<t;++s)a.push(r.indicesSet("a",e[s],`i[${s}]`));return a.push("return a;}"),a.join(`
`)},Qo=(e,t)=>{let r,i,a,s,n,l,d=t.format==="NHWC",p=t.blocksize,f=t.mode==="DCR";d?([r,i,a,s]=e.dims,n=f?[r,i,a,p,p,s/p**2]:[r,i,a,s/p**2,p,p],l=f?[0,1,3,2,4,5]:[0,1,4,2,5,3]):([r,i,a,s]=[e.dims[0],e.dims[2],e.dims[3],e.dims[1]],n=f?[r,p,p,s/p**2,i,a]:[r,s/p**2,p,p,i,a],l=f?[0,3,4,1,5,2]:[0,1,4,2,5,3]);let c=e.reshape(n),u=c.dims.length,y=e.dataType,w=B("a",y,u),$=F("output",y,u),b=x=>`
  ${x.registerUniform("output_size","u32").declareVariables(w,$)}

  ${Zo(l,u,w,$)}

  ${x.mainStart()}
    ${x.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let indices = ${$.offsetToIndices("global_idx")};
    let aIndices = perm(indices);

    ${$.setByOffset("global_idx",w.getByIndices("aIndices"))}
  }`;return{name:"DepthToSpace",shaderCache:{hint:`${e.dims};${t.blocksize};${t.mode}`,inputDependencies:["rank"]},getRunData:x=>{let v=d?[r,i*p,a*p,s/p**2]:[r,s/p**2,i*p,a*p],k=O.size(v),S=c.dims,E=O.sortBasedOnPerm(S,l);return{outputs:[{dims:v,dataType:x[0].dataType}],dispatchGroup:{x:Math.ceil(k/64)},programUniforms:[{type:12,data:k},...L(S,E)]}},getShaderSource:b}},Fp=(e,t)=>{Yo(e.inputs),e.compute(Qo(e.inputs[0],t))},Hp=e=>fe({blocksize:e.blocksize,mode:e.mode,format:e.format})}),xr,Vt,zi,Xo,Jo,eu,tu,Ai,ru,Kp,Yp,pm=D(()=>{X(),te(),be(),re(),xr="[a-zA-Z]|\\.\\.\\.",Vt="("+xr+")+",zi="^"+Vt+"$",Xo="("+Vt+",)*"+Vt,Jo="^"+Xo+"$",eu=class{constructor(e=-1){this.symbolToIndices=new Map,this.inputIndex=e}addSymbol(e,t){let r=this.symbolToIndices.get(e);r===void 0?r=[t]:r.push(t),this.symbolToIndices.set(e,r)}},tu=class{constructor(e,t){var a;this.equation=t,this.hasEllipsis=!1,this.symbolToInfo=new Map,this.lhs=new Array,this.outputDims=[];let[r,i]=t.includes("->")?t.split("->",2):[t,""];if(!r.match(RegExp(Jo)))throw new Error("Invalid LHS term");if(r.split(",").forEach((s,n)=>{let l=e[n].dims.slice();if(!s.match(RegExp(zi)))throw new Error("Invalid LHS term");let d=this.processTerm(s,!0,l,n);this.lhs.push(d)}),i==="")i+=[...this.symbolToInfo.entries()].filter(([s,n])=>n.count===1||s==="...").map(([s])=>s).join("");else if(!i.match(RegExp(Vt)))throw new Error("Invalid RHS");(a=i.match(RegExp(xr,"g")))==null||a.forEach(s=>{if(s==="...")this.outputDims=this.outputDims.concat(this.ellipsisDims);else{let n=this.symbolToInfo.get(s);if(n===void 0)throw new Error("Invalid RHS symbol");this.outputDims.push(n.dimValue)}}),this.rhs=this.processTerm(i,!1,this.outputDims)}addSymbol(e,t,r){let i=this.symbolToInfo.get(e);if(i!==void 0){if(i.dimValue!==t&&i.count!==1)throw new Error("Dimension mismatch");i.count++,i.inputIndices.push(r)}else i={count:1,dimValue:t,inputIndices:[r]};this.symbolToInfo.set(e,i)}processTerm(e,t,r,i=-1){let a=r.length,s=!1,n=[],l=0;if(!e.match(RegExp(zi))&&!t&&e!=="")throw new Error("Invalid LHS term");let d=e.match(RegExp(xr,"g")),p=new eu(i);return d==null||d.forEach((f,c)=>{if(f==="..."){if(s)throw new Error("Only one ellipsis is allowed per input term");s=!0;let u=a-d.length+1;if(u<0)throw new Error("Ellipsis out of bounds");if(n=r.slice(l,l+u),this.hasEllipsis){if(this.ellipsisDims.length!==n.length||this.ellipsisDims.toString()!==n.toString())throw new Error("Ellipsis dimensions mismatch")}else if(t)this.hasEllipsis=!0,this.ellipsisDims=n;else throw new Error("Ellipsis must be specified in the LHS");for(let y=0;y<n.length;y++){let w=String.fromCharCode(48+y);p.addSymbol(w,c+y),this.addSymbol(w,r[l++],i)}}else p.addSymbol(f,c+(this.hasEllipsis?this.ellipsisDims.length-1:0)),this.addSymbol(f,r[l++],i)}),p}},Ai=e=>e+"_max",ru=(e,t,r,i)=>{let a=e.map(p=>p.length).map((p,f)=>B(`input${f}`,t,p)),s=O.size(i),n=F("output",t,i.length),l=[...r.symbolToInfo.keys()].filter(p=>!r.rhs.symbolToIndices.has(p)),d=p=>{let f=[],c="var prod = 1.0;",u="var sum = 0.0;",y="sum += prod;",w=[],$=[],b=[],x=[],v=r.symbolToInfo.size===r.rhs.symbolToIndices.size;r.symbolToInfo.forEach((S,E)=>{var z;if(r.rhs.symbolToIndices.has(E)){let T=(z=r.rhs.symbolToIndices.get(E))==null?void 0:z[0];T!==void 0&&r.lhs.forEach((M,W)=>{if(S.inputIndices.includes(W)){let V=M.symbolToIndices.get(E);if(V===void 0)throw new Error("Invalid symbol error");V.forEach(J=>{f.push(`${a[W].indicesSet(`input${W}Indices`,J,n.indicesGet("outputIndices",T))}`)})}})}else r.lhs.forEach((T,M)=>{if(S.inputIndices.includes(M)){let W=T.symbolToIndices.get(E);if(W===void 0)throw new Error("Invalid symbol error");W.forEach(V=>{w.push(`${a[M].indicesSet(`input${M}Indices`,V,`${E}`)}`)}),x.push(`prod *= ${a[M].getByIndices(`input${M}Indices`)};`)}}),$.push(`for(var ${E}: u32 = 0; ${E} < uniforms.${Ai(E)}; ${E}++) {`),b.push("}")});let k=v?[...f,`let sum = ${a.map((S,E)=>S.getByIndices(`input${E}Indices`)).join(" * ")};`]:[...f,u,...$,...w,c,...x,y,...b];return`
            ${p.registerUniforms(l.map(S=>({name:`${Ai(S)}`,type:"u32"}))).registerUniform("outputSize","u32").declareVariables(...a,n)}

            ${p.mainStart()}
            ${p.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
            var outputIndices = ${n.offsetToIndices("global_idx")};
            ${a.map((S,E)=>`var input${E}Indices: ${a[E].type.indices};`).join(`
`)}
            ${k.join(`
`)};
            ${n.setByOffset("global_idx","sum")};
          }`};return{name:"Einsum",shaderCache:{hint:r.equation,inputDependencies:e.map(()=>"rank")},getRunData:()=>{let p=l.filter(c=>r.symbolToInfo.has(c)).map(c=>{var u;return{type:12,data:((u=r.symbolToInfo.get(c))==null?void 0:u.dimValue)||0}});p.push({type:12,data:s});let f=e.map((c,u)=>[...L(c)]).reduce((c,u)=>c.concat(u),p);return f.push(...L(i)),{outputs:[{dims:i,dataType:t}],dispatchGroup:{x:Math.ceil(s/64)},programUniforms:f}},getShaderSource:d}},Kp=(e,t)=>{let r=new tu(e.inputs,t.equation),i=r.outputDims,a=e.inputs.map((s,n)=>s.dims);e.compute(ru(a,e.inputs[0].dataType,r,i))},Yp=e=>{let t=e.equation.replace(/\s+/g,"");return fe({equation:t})}}),iu,Oi,au,nu,Zp,hm=D(()=>{X(),te(),re(),iu=e=>{if(!e||e.length!==2)throw new Error("Expand requires 2 input.");let t=e[0].dims,r=Array.from(e[1].getBigInt64Array(),Number),i=r.length<t.length?0:r.length-t.length,a=t.length<r.length?0:t.length-r.length;for(;i<r.length&&a<t.length;++i,++a)if(r[i]!==t[a]&&r[i]!==1&&t[a]!==1)throw new Error("Expand requires shape to be broadcastable to input")},Oi=(e,t)=>{let r=e.length-t.length,i=[];for(let a=0;a<r;++a)i.push(e[a]);for(let a=0;a<t.length;++a)i.push(t[a]===1?e[a+r]:t[a]);return i},au=(e,t)=>e.length>t.length?Oi(e,t):Oi(t,e),nu=e=>{let t=e[0].dims,r=Array.from(e[1].getBigInt64Array(),Number),i=au(t,r),a=e[0].dataType,s=a===9?4:1,n=Math.ceil(O.size(i)/s),l=p=>{let f=B("input",a,t.length,s),c=F("output",a,i.length,s),u;if(a===9){let y=(w,$,b="")=>`
          let outputIndices${$} = ${c.offsetToIndices(`outputOffset + ${$}u`)};
          let offset${$} = ${f.broadcastedIndicesToOffset(`outputIndices${$}`,c)};
          let index${$} = offset${$} / 4u;
          let component${$} = offset${$} % 4u;
          ${w}[${$}] = ${b}(${f.getByOffset(`index${$}`)}[component${$}]);
        `;u=`
        let outputOffset = global_idx * ${s};
        var data = vec4<u32>(0);
        ${y("data",0,"u32")}
        ${y("data",1,"u32")}
        ${y("data",2,"u32")}
        ${y("data",3,"u32")}
        ${c.setByOffset("global_idx","data")}
      }`}else u=`
        let outputIndices = ${c.offsetToIndices("global_idx")};
        let inputOffset = ${f.broadcastedIndicesToOffset("outputIndices",c)};
        ${c.setByOffset("global_idx",f.getByOffset("inputOffset"))}
      }`;return`
    ${p.registerUniform("vec_size","u32").declareVariables(f,c)}
    ${p.mainStart()}
    ${p.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}
    ${u}`},d=[{type:12,data:n},...L(t,i)];return{name:"Expand",shaderCache:{hint:`${i.length}`,inputDependencies:["rank"]},getShaderSource:l,getRunData:()=>({outputs:[{dims:i,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(n/64)},programUniforms:d})}},Zp=e=>{iu(e.inputs),e.compute(nu(e.inputs),{inputs:[0]})}}),su,Qp,cm=D(()=>{X(),te(),re(),Oa(),su=e=>{let t=e[0].dataType,r=O.size(e[0].dims),i=O.size(e[1].dims),a=i%4===0,s=n=>{let l=B("x",t,[1],4),d=B("bias",t,[1],4),p=F("y",t,[1],4),f=[{name:"output_vec_size",type:"u32"},{name:"bias_size",type:"u32"}],c=y=>`
      let bias${y}_offset: u32 = (global_idx * 4 + ${y}) % uniforms.bias_size;
      let bias${y} = ${d.getByOffset(`bias${y}_offset / 4`)}[bias${y}_offset % 4];`,u=a?`
      let bias = ${d.getByOffset("global_idx % (uniforms.bias_size / 4)")};`:`${c(0)}${c(1)}${c(2)}${c(3)}
      let bias = ${l.type.value}(bias0, bias1, bias2, bias3);`;return`${n.registerUniforms(f).declareVariables(l,d,p)}

    ${na(ze(t))}

    ${n.mainStart(Dt)}
      ${n.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_vec_size")}

      let x = ${l.getByOffset("global_idx")};
      ${u}
      let x_in = x + bias;
      ${p.setByOffset("global_idx",sa("x_in"))}
    }`};return{name:"FastGeluWithBias",shaderCache:{hint:`${a}`,inputDependencies:["type","type"]},getShaderSource:s,getRunData:n=>({outputs:[{dims:n[0].dims,dataType:n[0].dataType}],programUniforms:[{type:12,data:Math.ceil(r/4)},{type:12,data:i}],dispatchGroup:{x:Math.ceil(r/Dt/4)}})}},Qp=e=>{e.inputs.length<2||O.size(e.inputs[1].dims)===0?gp(e):e.compute(su(e.inputs))}}),ou,uu,Xp,Jp,fm=D(()=>{X(),te(),be(),re(),ou=e=>{if(!e||e.length!==2)throw new Error("Gather requires 2 inputs.")},uu=(e,t)=>{let r=e[0].dims,i=e[1].dims,a=r.length,s=O.normalizeAxis(t.axis,a),n=r.slice(0);n.splice(s,1,...i);let l=r[s],d=e[0].dataType===9?4:1,p=Math.ceil(O.size(n)/d),f=[{type:12,data:p},{type:6,data:l},{type:12,data:s},...L(e[0].dims,e[1].dims,n)],c=u=>{let y=B("data",e[0].dataType,e[0].dims.length,d),w=B("inputIndices",e[1].dataType,e[1].dims.length),$=F("output",e[0].dataType,n.length,d),b=v=>{let k=i.length,S=`var indicesIndices${v}  = ${w.type.indices}(0);`;for(let E=0;E<k;E++)S+=`${k>1?`indicesIndices${v}[${E}]`:`indicesIndices${v}`} = ${n.length>1?`outputIndices${v}[uniforms.axis + ${E}]`:`outputIndices${v}`};`;S+=`
          var idx${v} = ${w.getByIndices(`indicesIndices${v}`)};
          if (idx${v} < 0) {
            idx${v} = idx${v} + uniforms.axisDimLimit;
          }
          var dataIndices${v} : ${y.type.indices};
        `;for(let E=0,z=0;E<a;E++)E===s?(S+=`${a>1?`dataIndices${v}[${E}]`:`dataIndices${v}`} = u32(idx${v});`,z+=k):(S+=`${a>1?`dataIndices${v}[${E}]`:`dataIndices${v}`} = ${n.length>1?`outputIndices${v}[${z}]`:`outputIndices${v}`};`,z++);return S},x;if(e[0].dataType===9){let v=(k,S,E="")=>`
          let outputIndices${S} = ${$.offsetToIndices(`outputOffset + ${S}u`)};
          ${b(S)};
          let offset${S} = ${y.indicesToOffset(`dataIndices${S}`)};
          let index${S} = offset${S} / 4u;
          let component${S} = offset${S} % 4u;
          ${k}[${S}] = ${E}(${y.getByOffset(`index${S}`)}[component${S}]);
        `;x=`
        let outputOffset = global_idx * ${d};
        var value = vec4<u32>(0);
        ${v("value",0,"u32")}
        ${v("value",1,"u32")}
        ${v("value",2,"u32")}
        ${v("value",3,"u32")}
        ${$.setByOffset("global_idx","value")}
      `}else x=`
      let outputIndices = ${$.offsetToIndices("global_idx")};
      ${b("")};
      let value = ${y.getByIndices("dataIndices")};
      ${$.setByOffset("global_idx","value")};
      `;return`
      ${u.registerUniform("outputSize","u32").registerUniform("axisDimLimit","i32").registerUniform("axis","u32").declareVariables(y,w,$)}
      ${u.mainStart()}
        ${u.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
        ${x}
      }`};return{name:"Gather",shaderCache:{hint:t.cacheKey,inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:n,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(p/64)},programUniforms:f}),getShaderSource:c}},Xp=e=>fe({axis:e.axis}),Jp=(e,t)=>{let r=e.inputs;ou(r),e.compute(uu(e.inputs,t))}}),lu,du,eh,th,mm=D(()=>{X(),te(),be(),re(),lu=(e,t)=>{if(e.length<3||e.length>4)throw new Error("GatherBlockQuantized requires 3 or 4 inputs.");let r=O.normalizeAxis(t.quantizeAxis,e[0].dims.length),i=t.blockSize,a=e[0],s=e[2],n=e.length===4?e[3]:void 0;if(s.dims.length!==a.dims.length||!a.dims.map((l,d)=>d===r?Math.ceil(l/i)===s.dims[d]:l===s.dims[d]).reduce((l,d)=>l&&d,!0))throw new Error("Scales must have the same rank as the input tensor and the dims should match except on gatherAxis.");if(n){if(n.dataType!==a.dataType)throw new Error("Zero point must have the same data type as the input tensor.");if(n.dims.length!==s.dims.length||!n.dims.map((l,d)=>l===s.dims[d]).reduce((l,d)=>l&&d,!0))throw new Error("Zero point must have the same rank as the input tensor and the dims should match except on quantizeAxis.")}},du=(e,t)=>{let r=e[0].dims,i=e[1].dims,a=r.length,s=O.normalizeAxis(t.gatherAxis,a),n=O.normalizeAxis(t.quantizeAxis,a),l=r.slice(0);l.splice(s,1,...i);let d=O.size(l),p=e[2].dataType,f=e[0].dataType===22,c=[{type:12,data:d},{type:12,data:n},{type:12,data:s},{type:12,data:t.blockSize},...L(...e.map((y,w)=>y.dims),l)],u=y=>{let w=B("data",e[0].dataType,e[0].dims.length),$=B("inputIndices",e[1].dataType,e[1].dims.length),b=B("scales",e[2].dataType,e[2].dims.length),x=e.length>3?B("zeroPoint",e[3].dataType,e[3].dims.length):void 0,v=F("output",p,l.length),k=[w,$,b];x&&k.push(x);let S=[{name:"output_size",type:"u32"},{name:"quantize_axis",type:"u32"},{name:"gather_axis",type:"u32"},{name:"block_size",type:"u32"}];return`
        ${y.registerUniforms(S).declareVariables(...k,v)}
        ${y.mainStart()}
        let output_indices = ${v.offsetToIndices("global_idx")};
        var indices_indices = ${$.type.indices}(0);
        ${i.length>1?`
          for (var i: u32 = 0; i < ${i.length}; i++) {
            let index = ${v.indicesGet("output_indices","uniforms.gather_axis + i")};
            ${$.indicesSet("indices_indices","i","index")};
          }`:`indices_indices = ${v.indicesGet("output_indices","uniforms.gather_axis")};`};
        var data_indices = ${w.type.indices}(0);
        for (var i: u32 = 0; i < uniforms.gather_axis; i++) {
          let index = ${v.indicesGet("output_indices","i")};
          ${w.indicesSet("data_indices","i","index")};
        }
        var index_from_indices = ${$.getByIndices("indices_indices")};
        if (index_from_indices < 0) {
          index_from_indices += ${r[s]};
        }
        ${w.indicesSet("data_indices","uniforms.gather_axis","u32(index_from_indices)")};
        for (var i = uniforms.gather_axis + 1; i < ${l.length}; i++) {
          let index = ${v.indicesGet("output_indices",`i + ${i.length} - 1`)};
          ${w.indicesSet("data_indices","i","index")};
        }
        let data_offset = ${w.indicesToOffset("data_indices")};
        let data_index = data_offset % 8;
        // Convert 4-bit packed data to 8-bit packed data.
        let packed_4bit_quantized_data = ${w.getByOffset("data_offset / 8")};
        let packed_8bit_quantized_data = (packed_4bit_quantized_data >> (4 * (data_index % 2))) & 0x0f0f0f0f;
        let quantized_data_vec = ${f?"unpack4xI8":"unpack4xU8"}(u32(packed_8bit_quantized_data));
        let quantized_data = quantized_data_vec[data_index / 2];
        var scale_indices = data_indices;
        let quantize_axis_index = ${b.indicesGet("data_indices","uniforms.quantize_axis")} / uniforms.block_size;
        ${b.indicesSet("scale_indices","uniforms.quantize_axis","quantize_axis_index")};
        var scale = ${b.getByIndices("scale_indices")};
        ${x?`
              let zero_point_indices = scale_indices;
              let zero_point_offset = ${x.indicesToOffset("zero_point_indices")};
              let zero_point_index = zero_point_offset % 8;
              let packed_4bit_zero_points = ${x.getByOffset("zero_point_offset / 8")};
              let packed_8bit_zero_points = (packed_4bit_zero_points >> (4 * (zero_point_index % 2))) & 0x0f0f0f0f;
              let zero_point_vec = ${f?"unpack4xI8":"unpack4xU8"}(u32(packed_8bit_zero_points));
              let zero_point = zero_point_vec[zero_point_index / 2];`:"var zero_point = 0"};
        let dequantized_data = ${ze(p)}(quantized_data - zero_point) * scale;
        ${v.setByOffset("global_idx","dequantized_data")};
    }`};return{name:"GatherBlockQuantized",shaderCache:{hint:`${t.cacheKey};${e.filter((y,w)=>w!==1).map(y=>y.dims.join("_")).join(";")}`,inputDependencies:Array.from({length:e.length},(y,w)=>"rank")},getRunData:()=>({outputs:[{dims:l,dataType:p}],dispatchGroup:{x:Math.ceil(d/64)},programUniforms:c}),getShaderSource:u}},eh=(e,t)=>{let r=e.inputs;lu(r,t),e.compute(du(e.inputs,t))},th=e=>fe({blockSize:e.blockSize,gatherAxis:e.gatherAxis,quantizeAxis:e.quantizeAxis})}),pu,hu,rh,ih,gm=D(()=>{X(),te(),be(),re(),pu=e=>{if(!e||e.length!==2)throw new Error("GatherElements requires 2 inputs.");if(e[0].dims.length<1)throw new Error("GatherElements requires that the data input be rank >= 1.");if(e[0].dims.length!==e[1].dims.length)throw new Error(`GatherElements requires that the data input and
                     indices input tensors be of same rank.`)},hu=(e,t)=>{let r=e[0].dims,i=e[0].dataType,a=r.length,s=e[1].dims,n=e[1].dataType,l=O.normalizeAxis(t.axis,a),d=r[l],p=s.slice(0),f=O.size(p),c=B("input",i,a),u=B("indicesInput",n,s.length),y=F("output",i,p.length),w=[{type:12,data:f},{type:6,data:d},{type:12,data:l}];return w.push(...L(r,s,p)),{name:"GatherElements",shaderCache:{inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:p,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(f/64)},programUniforms:w}),getShaderSource:$=>`
      ${$.registerUniform("outputSize","u32").registerUniform("axisDimLimit","i32").registerUniform("axis","u32").declareVariables(c,u,y)}
      ${$.mainStart()}
      ${$.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}

      let outputIndices = ${y.offsetToIndices("global_idx")};

      var idx = ${u.getByOffset("global_idx")};
      if (idx < 0) {
        idx = idx + uniforms.axisDimLimit;
      }
      var inputIndices = ${c.type.indices}(outputIndices);
      ${c.indicesSet("inputIndices","uniforms.axis","u32(idx)")};
      let value = ${c.getByIndices("inputIndices")};

      ${y.setByOffset("global_idx","value")};
  }`}},rh=e=>fe({axis:e.axis}),ih=(e,t)=>{let r=e.inputs;pu(r),e.compute(hu(e.inputs,t))}}),cu,fu,ah,nh,ym=D(()=>{X(),te(),re(),cu=e=>{if(!e)throw new Error("Input is missing");if(e.length<2||e.length>3)throw new Error("Invaid input number.");if(e.length===3&&e[2].dims.length>2)throw new Error("Invalid input shape of C");if(e[0].dataType!==e[1].dataType||e.length===3&&e[0].dataType!==e[2].dataType)throw new Error("Input types are mismatched")},fu=(e,t)=>{let r=e[0].dims.slice(),i=e[1].dims.slice(),[a,s,n]=ud.getShapeOfGemmResult(r,t.transA,i,t.transB,e.length===3?e[2].dims:void 0),l=[a,s];if(!l)throw new Error("Can't use gemm on the given tensors");let d=O.size(l),p=[{type:12,data:d},{type:12,data:a},{type:12,data:s},{type:12,data:n},{type:1,data:t.alpha},{type:1,data:t.beta}],f=["type","type"];e.length===3&&(p.push(...L(e[2].dims)),f.push("rank")),p.push(...L(l));let c=u=>{let y="";t.transA&&t.transB?y="value += a[k * uniforms.M + m] * b[n * uniforms.K + k];":t.transA&&!t.transB?y="value += a[k * uniforms.M + m] * b[k * uniforms.N + n];":!t.transA&&t.transB?y="value += a[m * uniforms.K + k] * b[n * uniforms.K + k];":!t.transA&&!t.transB&&(y="value += a[m * uniforms.K + k] * b[k * uniforms.N + n];");let w=t.alpha===1?"":"value *= uniforms.alpha;",$=B("a",e[0].dataType,e[0].dims),b=B("b",e[1].dataType,e[1].dims),x=$.type.value,v=null,k=[$,b];e.length===3&&(v=B("c",e[2].dataType,e[2].dims.length),k.push(v));let S=F("output",e[0].dataType,l.length);k.push(S);let E=[{name:"output_size",type:"u32"},{name:"M",type:"u32"},{name:"N",type:"u32"},{name:"K",type:"u32"},{name:"alpha",type:"f32"},{name:"beta",type:"f32"}];return`
  ${u.registerUniforms(E).declareVariables(...k)}

  ${u.mainStart()}
    ${u.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let m = global_idx / uniforms.N;
    let n = global_idx % uniforms.N;

    var value = ${x}(0);
    for (var k: u32 = 0u; k < uniforms.K; k++) {
      ${y}
    }

    ${w}
    ${v!=null?`let cOffset = ${v.broadcastedIndicesToOffset("vec2(m, n)",S)}; value += ${x}(uniforms.beta) * ${v.getByOffset("cOffset")};`:""}
    output[global_idx] = value;
  }`};return{name:"Gemm",shaderCache:{hint:`${t.cacheKey}`,inputDependencies:f},getRunData:()=>({outputs:[{dims:l,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(d/64)},programUniforms:p}),getShaderSource:c}},ah=e=>{let t=e.transA,r=e.transB,i=e.alpha,a=e.beta;return{transA:t,transB:r,alpha:i,beta:a,cacheKey:`${e.transA};${e.transB};${e.alpha===1}`}},nh=(e,t)=>{cu(e.inputs),e.compute(fu(e.inputs,t))}}),Re,mu,sh,Ri,gu,Qt,oh,uh=D(()=>{X(),te(),be(),Ta(),Aa(),re(),gt(),Re=(e,t)=>e.length>t&&e[t].dims.length>0?e[t]:void 0,mu=(e,t)=>{let r=e[0],i=Re(e,1),a=Re(e,2),s=Re(e,3),n=Re(e,4),l=Re(e,5),d=Re(e,6),p=Re(e,7);if(r.dims.length!==3&&r.dims.length!==5)throw new Error("Input query is expected to have 3 or 5 dimensions");let f=r.dims[0],c=r.dims[1],u=r.dims.length===3?r.dims[2]:t.numHeads*r.dims[4],y=c,w=0,$=0,b=Math.floor(u/t.numHeads);if(d&&p&&O.size(d.dims)&&O.size(p.dims)){if(d.dims.length!==4)throw new Error('Input "past_key" is expected to have 4 dimensions');if(d.dims[0]!==f||d.dims[1]!==t.numHeads||d.dims[3]!==b)throw new Error('Input "past_key" shape (batch_size, num_heads, past_sequence_length, head_size)');if(p.dims[0]!==f||p.dims[1]!==t.numHeads||p.dims[3]!==b)throw new Error('Input "past_value" shape (batch_size, num_heads, past_sequence_length, head_size)');if(d.dims[2]!==p.dims[2])throw new Error('Input "past_key" and "past_value" shall have same dim 2 (past_sequence_length)');if(p.dims.length!==4)throw new Error('Input "past_value" is expected to have 4 dimensions');w=d.dims[2],$=d.dims[2]}else if(d&&O.size(d.dims)||p&&O.size(p.dims))throw new Error('Input "past_key" and "past_value" shall be both present or both absent');let x;if(i&&O.size(i.dims)>0){if(r.dims.length!==3)throw new Error('Input "query" is expected to have 3 dimensions when key is given');if(i.dims.length<3||i.dims.length>5)throw new Error('Input "key" is expected to have 3, 4, or 5 dimensions');if(r.dims[0]!==i.dims[0])throw new Error('Input "query" and "key" shall have same dim 0 (batch size)');if(i.dims.length===3){if(i.dims[2]!==r.dims[2])throw new Error('Input "query" and "key" shall have same dim 2 (hidden_size)');x=2,y=i.dims[1]}else if(i.dims.length===5){if(i.dims[2]!==t.numHeads||i.dims[3]!==2||i.dims[4]!==b)throw new Error('Expect "key" shape (batch_size, kv_sequence_length, num_heads, 2, head_size) for packed kv');if(a)throw new Error('Expect "value" be none when "key" has packed kv format.');x=5,y=i.dims[1]}else{if(i.dims[1]!==t.numHeads||i.dims[3]!==b)throw new Error('Expect "key" shape (batch_size, num_heads, kv_sequence_length, head_size) for past_key');x=0,y=i.dims[2]}}else{if(r.dims.length!==5)throw new Error('Input "query" is expected to have 5 dimensions when key is empty');if(r.dims[2]!==t.numHeads||r.dims[3]!==3)throw new Error('Expect "query" shape (batch_size, kv_sequence_length, num_heads, 3, head_size) for packed kv');x=3}if(s&&O.size(s.dims)>0){if(s.dims.length!==1)throw new Error('Input "bias" is expected to have 1 dimension');if(i&&i.dims.length===5&&i.dims[3]===2)throw new Error("bias is not allowed for packed kv.")}let v=w+y,k=0;if(n&&O.size(n.dims)>0){k=8;let T=n.dims;throw T.length===1?T[0]===f?k=1:T[0]===3*f+2&&(k=3):T.length===2&&T[0]===f&&T[1]===v&&(k=5),k===8?new Error('Input "key_padding_mask" shape shall be (batch_size) or (batch_size, total_sequence_length)'):new Error("Mask not supported")}let S=!1,E=u;if(a&&O.size(a.dims)>0){if(a.dims.length!==3&&a.dims.length!==4)throw new Error('Input "value" is expected to have 3 or 4 dimensions');if(r.dims[0]!==a.dims[0])throw new Error('Input "query" and "value" shall have same dim 0 (batch_size)');if(a.dims.length===3){if(y!==a.dims[1])throw new Error('Input "key" and "value" shall have the same dim 1 (kv_sequence_length)');E=a.dims[2]}else{if(y!==a.dims[2])throw new Error('Input "key" and "value" shall have the same dim 2 (kv_sequence_length)');E=a.dims[1]*a.dims[3],S=!0}}let z=!1;if(n&&O.size(n.dims)>0)throw new Error("Key padding mask is not supported");if(l&&O.size(l.dims)>0){if(l.dims.length!==4)throw new Error('Input "attention_bias" is expected to have 4 dimensions');if(l.dims[0]!==f||l.dims[1]!==t.numHeads||l.dims[2]!==c||l.dims[3]!==v)throw new Error('Expect "attention_bias" shape (batch_size, num_heads, sequence_length, total_sequence_length)')}return{batchSize:f,sequenceLength:c,pastSequenceLength:w,kvSequenceLength:y,totalSequenceLength:v,maxSequenceLength:$,inputHiddenSize:0,hiddenSize:u,vHiddenSize:E,headSize:b,vHeadSize:Math.floor(E/t.numHeads),numHeads:t.numHeads,isUnidirectional:!1,pastPresentShareBuffer:!1,maskFilterValue:t.maskFilterValue,maskType:k,scale:t.scale,broadcastResPosBias:z,passPastInKv:S,qkvFormat:x}},sh=e=>fe({...e}),Ri=fe({perm:[0,2,1,3]}),gu=(e,t,r,i,a,s,n)=>{let l=[i,a,s],d=O.size(l),p=[{type:12,data:d},{type:12,data:n},{type:12,data:s}],f=c=>{let u=F("qkv_with_bias",t.dataType,l),y=B("qkv",t.dataType,l),w=B("bias",r.dataType,l),$=[{name:"output_size",type:"u32"},{name:"bias_offset",type:"u32"},{name:"hidden_size",type:"u32"}];return`
  ${c.registerUniforms($).declareVariables(y,w,u)}
  ${c.mainStart()}
    ${c.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let bias_offset_idx = (global_idx % uniforms.hidden_size) + uniforms.bias_offset;

    qkv_with_bias[global_idx] = qkv[global_idx] + bias[bias_offset_idx];
  }`};return e.compute({name:"MultiHeadAttentionAddBias",shaderCache:{inputDependencies:["type","type"]},getRunData:()=>({outputs:[{dims:l,dataType:t.dataType,gpuDataType:0}],dispatchGroup:{x:Math.ceil(d/64)},programUniforms:p}),getShaderSource:f},{inputs:[t,r],outputs:[-1]})[0]},Qt=(e,t,r,i,a,s,n,l)=>{let d=s;if(n&&O.size(n.dims)>0){if(i===1)throw new Error("AddBiasReshape is not implemented. Please export your model with packed QKV or KV");return d=gu(e,s,n,t,i,r*a,l),d=d.reshape([t,i,r,a]),r===1||i===1?d:e.compute(De(d,Ri.perm),{inputs:[d],outputs:[-1]})[0]}else return s.dims.length===3&&(d=s.reshape([t,i,r,a])),r===1||i===1?d:e.compute(De(d,Ri.perm),{inputs:[d],outputs:[-1]})[0]},oh=(e,t)=>{let r=mu(e.inputs,t),i=e.inputs[0],a=Re(e.inputs,1),s=Re(e.inputs,2),n=Re(e.inputs,3),l=Re(e.inputs,4),d=Re(e.inputs,5),p=Re(e.inputs,6),f=Re(e.inputs,7);if(i.dims.length===5)throw new Error("Packed QKV is not implemented");if((a==null?void 0:a.dims.length)===5)throw new Error("Packed KV is not implemented");let c=a&&s&&a.dims.length===4&&s.dims.length===4,u=Qt(e,r.batchSize,r.numHeads,r.sequenceLength,r.headSize,i,n,0);if(c)return Jt(e,u,a,s,l,void 0,p,f,d,r,t);if(!a||!s)throw new Error("key and value must be provided");let y=Qt(e,r.batchSize,r.numHeads,r.kvSequenceLength,r.headSize,a,n,r.hiddenSize),w=Qt(e,r.batchSize,r.numHeads,r.kvSequenceLength,r.vHeadSize,s,n,2*r.hiddenSize);Jt(e,u,y,w,l,void 0,p,f,d,r,t)}}),Bi,yu,wu,pa,lh,dh=D(()=>{X(),te(),re(),Bi=e=>Array.from(e.getBigInt64Array(),Number),yu=e=>{if(!e||e.length!==2)throw new Error("Tile requires 2 inputs.");if(e[0].dataType!==1&&e[0].dataType!==10&&e[0].dataType!==6&&e[0].dataType!==12)throw new Error("Tile only support float, float16, int32, and uint32 data types");if(e[1].dataType!==7)throw new Error("Tile `repeats` input should be of int64 data type");if(e[1].dims.length!==1)throw new Error("Tile `repeats` input should be 1-D");if(Bi(e[1]).length!==e[0].dims.length)throw new Error("Tile `repeats` input should have same number of elements as rank of input data tensor")},wu=(e,t)=>{let r=[];for(let i=0;i<e.length;++i)r.push(e[i]*t[i]);return r},pa=(e,t)=>{let r=e[0].dims,i=t??Bi(e[1]),a=wu(r,i),s=O.size(a),n=e[0].dataType,l=B("input",n,r.length),d=F("output",n,a.length),p=f=>`
      const inputShape = ${l.indices(...r)};
      ${f.registerUniform("output_size","u32").declareVariables(l,d)}
      ${f.mainStart()}
      ${f.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
      let output_indices = ${d.offsetToIndices("global_idx")};
      var input_indices: ${l.type.indices};
      for (var i = 0; i < ${r.length}; i++) {
        let input_dim_i = ${l.indicesGet("uniforms.input_shape","i")};
        let input_dim_value = ${d.indicesGet("output_indices","i")}  % input_dim_i;

        ${l.indicesSet("input_indices","i","input_dim_value")}
      }
      ${d.setByOffset("global_idx",l.getByIndices("input_indices"))}
    }`;return{name:"Tile",shaderCache:{hint:`${i}`,inputDependencies:["rank"]},getRunData:()=>({outputs:[{dims:a,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(s/64)},programUniforms:[{type:12,data:s},...L(e[0].dims,a)]}),getShaderSource:p}},lh=e=>{yu(e.inputs),e.compute(pa(e.inputs),{inputs:[0]})}}),$u,Mi,ph,_u,Pi,hh,wm=D(()=>{X(),te(),be(),Aa(),re(),uh(),dh(),gt(),$u=(e,t)=>{let r=e[0],i=e[1],a=e[2],s=e[3],n=e[4];if(r.dims.length!==3&&r.dims.length!==5)throw new Error("Input query is expected to have 3 or 5 dimensions");let l=!1,d=r.dims[0],p=r.dims[1],f=r.dims.length===3?l?r.dims[2]/3:r.dims[2]:t.numHeads*r.dims[4],c=p,u=0,y=0,w=Math.floor(f/t.numHeads),$=s&&s.dims.length!==0,b=n&&n.dims.length!==0,x=!0;if($&&b){if(s.dims.length!==4)throw new Error('Input "past_key" is expected to have 4 dimensions');if(n.dims.length!==4)throw new Error('Input "past_value" is expected to have 4 dimensions');u=s.dims[1],y=s.dims[1]}else if($||b)throw new Error('Input "past_key" and "past_value" shall be both present or both absent');let v;if(i){if(r.dims.length!==3)throw new Error('Input "query" is expected to have 3 dimensions when key is given');if(i.dims.length<3||i.dims.length>5)throw new Error('Input "key" is expected to have 3, 4, or 5 dimensions');if(r.dims[0]!==i.dims[0])throw new Error('Input "query" and "key" shall have same dim 0 (batch size)');if(i.dims.length===3){if(r.dims[2]%i.dims[2]!==0)throw new Error('Dimension 2 of "query" should be a multiple of "key"');v=2,c=i.dims[1]}else if(i.dims.length===5){if(i.dims[2]!==t.numHeads||i.dims[3]!==2||i.dims[4]!==w)throw new Error('Expect "key" shape (batch_size, kv_sequence_length, num_heads, 2, head_size) for packed kv');if(a)throw new Error('Expect "value" be none when "key" has packed kv format.');v=5,c=i.dims[1]}else{if(i.dims[1]!==t.numHeads||i.dims[3]!==w)throw new Error('Expect "key" shape (batch_size, num_heads, kv_sequence_length, head_size) for past_key');v=0,c=i.dims[2]}}else{if(r.dims.length!==3&&r.dims.length!==5)throw new Error('Input "query" is expected to have 3 or 5 dimensions when key is empty');if(r.dims.length===5&&(r.dims[2]!==t.numHeads||r.dims[3]!==3))throw new Error('Expect "query" shape (batch_size, kv_sequence_length, num_heads, 3, head_size) for packed kv');v=3}let k=0,S=!1,E=f;if(a){if(a.dims.length!==3&&a.dims.length!==4)throw new Error('Input "value" is expected to have 3 or 4 dimensions');if(r.dims[0]!==a.dims[0])throw new Error('Input "query" and "value" shall have same dim 0 (batch_size)');if(a.dims.length===3){if(c!==a.dims[1])throw new Error('Input "key" and "value" shall have the same dim 1 (kv_sequence_length)');E=a.dims[2]}else{if(c!==a.dims[2])throw new Error('Input "past_key" and "past_value" shall have the same dim 2 (kv_sequence_length)');E=a.dims[1]*a.dims[3],S=!0}}let z=u+c;return{batchSize:d,sequenceLength:p,pastSequenceLength:u,kvSequenceLength:c,totalSequenceLength:z,maxSequenceLength:y,inputHiddenSize:0,hiddenSize:f,vHiddenSize:E,headSize:w,vHeadSize:Math.floor(E/t.kvNumHeads),numHeads:t.numHeads,kvNumHeads:t.kvNumHeads,nReps:t.numHeads/t.kvNumHeads,pastPresentShareBuffer:!1,maskType:k,scale:t.scale,broadcastResPosBias:!1,passPastInKv:S,qkvFormat:v,isPastkvBSNH:x}},Mi=(e,t,r,i)=>{let a=[i.batchSize,i.totalSequenceLength,i.kvNumHeads,i.headSize],s=4,n=O.size(a)/s,l=i.totalSequenceLength,d=F("present_kv",r,a.length,s),p=B("new_kv",e.dataType,e.dims.length,s),f=t?B("past_kv",t.dataType,t.dims.length,s):void 0,c=Math.ceil(i.headSize/s),u={x:l,y:e.dims[0],z:1},y=t?["rank","rank"]:["rank"],w=[{type:12,data:n},{type:12,data:i.pastSequenceLength},{type:12,data:i.kvSequenceLength},{type:12,data:i.totalSequenceLength}],$=[p];f?(w.push(...L(e.dims),...L(t.dims),...L(a)),$.push(f)):w.push(...L(e.dims),...L(a));let b=[{name:"output_size",type:"u32"},{name:"past_seqlen",type:"u32"},{name:"new_seqlen",type:"u32"},{name:"present_seqlen",type:"u32"}],x=`      let past_batch_stride = uniforms.past_seqlen * num_heads * H;
        var past_head_stride = uniforms.past_seqlen * H;
        if (is_bsnh) {
          past_head_stride = H;
        }
        let in_offset = b * past_batch_stride + s * row_stride + n * past_head_stride + h;
        present_kv[out_offset] = past_kv[in_offset];`,v=`      let new_batch_stride = uniforms.new_seqlen * num_heads * H;
        let new_row_stride = num_heads * H;
        let new_head_stride = H;
        let in_offset = b * new_batch_stride + (s - past_seqlen) * new_row_stride + n * new_head_stride + h;
        present_kv[out_offset] = new_kv[in_offset];`,k=t?`if (s < past_seqlen) {
        ${x}
        } else if (s < past_seqlen + uniforms.new_seqlen) {
        ${v}
        }`:`if (s < past_seqlen + uniforms.new_seqlen) {
          ${v}
        }`,S=E=>`

  ${E.registerUniforms(b).declareVariables(...$,d)}
  ${E.mainStart([c,i.kvNumHeads,1])}
    ${E.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    var indices = ${d.offsetToIndices("global_idx")};
    let h = local_id.x;
    let n = local_id.y;
    let s = workgroup_id.x;
    let b = workgroup_id.y;
    let num_heads = ${i.kvNumHeads}u;
    let H = ${c}u;

    let present_seqlen = uniforms.present_seqlen;
    let present_batch_stride = present_seqlen * num_heads * H;
    var row_stride = H;
    let is_bsnh = ${i.isPastkvBSNH};

    if (is_bsnh) {
      row_stride = num_heads * H;
    }
    var present_head_stride = present_seqlen * H;
    if (is_bsnh) {
      present_head_stride = H;
    }

    let past_seqlen = uniforms.past_seqlen;

    let out_offset = b * present_batch_stride + s * row_stride + n * present_head_stride + h;
    ${k}
  }`;return{name:"ConcatPastNew",shaderCache:{hint:`${i.kvNumHeads}${c}${!!t}`,inputDependencies:y},getRunData:()=>({outputs:[{dims:a,dataType:r}],dispatchGroup:u,programUniforms:w}),getShaderSource:S}},ph=e=>fe({...e}),_u=fe({perm:[0,2,1,3]}),Pi=(e,t,r,i,a)=>{let s=t,n=i.kvNumHeads,l=i.nReps;return t.dims.length===3&&i.kvSequenceLength!==0&&(s=t.reshape([i.batchSize,i.kvSequenceLength,n,i.headSize])),r?s=e.compute(Mi(s,r,s.dataType,i),{inputs:[s,r],outputs:[i.isPastkvBSNH?a:-1]})[0]:s=e.compute(Mi(s,void 0,s.dataType,i),{inputs:[s],outputs:[i.isPastkvBSNH?a:-1]})[0],l!==1&&(s=e.compute(pa([s],[1,1,1,l]),{inputs:[s],outputs:[-1]})[0],s=s.reshape([i.batchSize,i.totalSequenceLength,n*l,i.headSize])),e.compute(De(s,_u.perm),{inputs:[s],outputs:[-1]})[0]},hh=(e,t)=>{var d;let r=$u(e.inputs,t);if(e.inputs[0].dims.length===5)throw new Error("Packed QKV is not implemented");if(((d=e.inputs[1])==null?void 0:d.dims.length)===5)throw new Error("Packed KV is not implemented");let i=Qt(e,r.batchSize,r.numHeads,r.sequenceLength,r.headSize,e.inputs[0],void 0,0),a=e.inputs[3]&&e.inputs[3].dims.length!==0?e.inputs[3]:void 0,s=e.inputs[4]&&e.inputs[4].dims.length!==0?e.inputs[4]:void 0,n=Pi(e,e.inputs[1],a,r,1),l=Pi(e,e.inputs[2],s,r,2);Jt(e,i,n,l,void 0,void 0,void 0,void 0,void 0,r,t)}}),Di,vu,bu,ch,$m=D(()=>{X(),te(),gt(),re(),Di=(e,t,r,i,a,s,n,l)=>{let d=_e(s),p=d===1?"f32":`vec${d}f`,f=d===1?"vec2f":`mat2x${d}f`,c=a*n,u=[a,n,s/d],y=[a,n,2],w=["rank","type","type"],$=[];$.push(...L(u,y));let b=x=>{let v=B("x",t.dataType,3,d),k=B("scale",r.dataType,r.dims),S=B("bias",i.dataType,i.dims),E=F("output",1,3,2),z=[v,k,S,E],T=64;return`
  var<workgroup> workgroup_shared : array<${f}, ${T}>;
  const workgroup_size = ${T}u;
  ${x.declareVariables(...z)}
  ${x.mainStart(T)}
    let batch = workgroup_index / uniforms.x_shape[1];
    let channel = workgroup_index % uniforms.x_shape[1];
    let hight = uniforms.x_shape[2];
    // initialize workgroup memory
    var sum = ${p}(0);
    var squared_sum = ${p}(0);
    for (var h = local_idx; h < hight; h += workgroup_size) {
      let value = ${p}(${v.get("batch","channel","h")});
      sum += value;
      squared_sum += value * value;
    }
    workgroup_shared[local_idx] = ${f}(sum, squared_sum);
    workgroupBarrier();

    for (var currSize = workgroup_size >> 1;  currSize > 0; currSize = currSize >> 1) {
      if (local_idx < currSize) {
        workgroup_shared[local_idx] = workgroup_shared[local_idx] + workgroup_shared[local_idx + currSize];
      }
      workgroupBarrier();
    }
    if (local_idx == 0) {
      let sum_final = ${ht("workgroup_shared[0][0]",d)} / f32(hight * ${d});
      let squared_sum_final = ${ht("workgroup_shared[0][1]",d)} / f32(hight * ${d});

      let inv_std_dev = inverseSqrt(squared_sum_final - sum_final * sum_final + f32(${l}));
      let channel_scale = inv_std_dev * f32(scale[channel]);
      let channel_shift = f32(bias[channel]) - sum_final * channel_scale;
      output[workgroup_index] = vec2f(channel_scale, channel_shift);
    }
  }`};return e.compute({name:"InstanceNormComputeChannelScaleShift",shaderCache:{hint:`${d};${l}`,inputDependencies:w},getRunData:()=>({outputs:[{dims:y,dataType:1}],dispatchGroup:{x:c},programUniforms:$}),getShaderSource:b},{inputs:[t,r,i],outputs:[-1]})[0]},vu=(e,t,r)=>{let i=t[0].dims,a=i,s=2,n=i[0],l=i[1],d=O.sizeFromDimension(i,s),p=_e(d),f=O.size(a)/p,c=Di(e,t[0],t[1],t[2],n,d,l,r.epsilon),u=[n,l,d/p],y=[n,l],w=["type","none"],$=b=>{let x=B("x",t[0].dataType,u.length,p),v=B("scale_shift",1,y.length,2),k=F("output",t[0].dataType,u.length,p),S=[x,v,k];return`
  ${b.registerUniform("output_size","u32").declareVariables(...S)}
  ${b.mainStart()}
  ${b.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
      let outputIndices = ${k.offsetToIndices("global_idx")};
      let batch = outputIndices[0];
      let channel = outputIndices[1];
      let scale_shift = ${v.getByIndices("vec2<u32>(batch, channel)")};
      let value = ${x.getByOffset("global_idx")} * ${k.type.value}(scale_shift.x) + ${k.type.value}(scale_shift.y);
      ${k.setByOffset("global_idx","value")};
  }`};e.compute({name:"InstanceNormalization",shaderCache:{hint:`${p}`,inputDependencies:w},getRunData:()=>({outputs:[{dims:a,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(f/64)},programUniforms:[{type:12,data:f},...L(u,y,u)]}),getShaderSource:$},{inputs:[t[0],c]})},bu=(e,t,r)=>{let i=t[0].dims,a=i,s=i[0],n=i[i.length-1],l=O.sizeFromDimension(i,1)/n,d=_e(n),p=O.size(a)/d,f=[{type:12,data:l},{type:12,data:Math.floor(n/d)}],c=["type","type"],u=[0,i.length-1];for(let b=0;b<i.length-2;b++)u.push(b+1);let y=e.compute(De(e.inputs[0],u),{inputs:[e.inputs[0]],outputs:[-1]})[0],w=Di(e,y,t[1],t[2],s,l,n,r.epsilon),$=b=>{let x=Se(t[0].dataType),v=d===1?"vec2f":`mat${d}x2f`,k=z=>{let T=z===0?"x":"y",M=d===1?"f32":`vec${d}f`;switch(d){case 1:return`${x}(${M}(scale.${T}))`;case 2:return`vec2<${x}>(${M}(scale[0].${T}, scale[1].${T}))`;case 4:return`vec4<${x}>(${M}(scale[0].${T}, scale[1].${T}, scale[2].${T}, scale[3].${T}))`;default:throw new Error(`Not supported compoents ${d}`)}},S=B("input",t[0].dataType,t[0].dims,d),E=F("output",t[0].dataType,a,d);return`
  @group(0) @binding(0) var<storage, read> input : array<${S.type.storage}>;
  @group(0) @binding(1) var<storage, read> scale_input : array<${v}>;
  @group(0) @binding(2) var<storage, read_write> output : array<${E.type.storage}>;
  struct Uniforms {H: u32, C : u32};
  @group(0) @binding(3) var<uniform> uniforms: Uniforms;

  ${b.mainStart()}
    let current_image_number = global_idx / (uniforms.C * uniforms.H);
    let current_channel_number = global_idx % uniforms.C;

    let scale_offset = current_image_number * uniforms.C + current_channel_number;
    let scale = scale_input[scale_offset];
    output[global_idx] = fma(input[global_idx], ${k(0)}, ${k(1)});
  }`};e.compute({name:"InstanceNormalizationNHWC",shaderCache:{hint:`${d}`,inputDependencies:c},getRunData:()=>({outputs:[{dims:a,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(p/64)},programUniforms:f}),getShaderSource:$},{inputs:[t[0],w]})},ch=(e,t)=>{t.format==="NHWC"?bu(e,e.inputs,t):vu(e,e.inputs,t)}}),xu,Su,fh,_m=D(()=>{X(),te(),re(),xu=e=>{if(!e||e.length<2)throw new Error("layerNorm requires at least 2 inputs.")},Su=(e,t,r)=>{let i=t.simplified,a=e[0].dims,s=e[1],n=!i&&e[2],l=a,d=O.normalizeAxis(t.axis,a.length),p=O.sizeToDimension(a,d),f=O.sizeFromDimension(a,d),c=O.size(s.dims),u=n?O.size(n.dims):0;if(c!==f||n&&u!==f)throw new Error(`Size of X.shape()[axis:] == ${f}.
       Size of scale and bias (if provided) must match this.
       Got scale size of ${c} and bias size of ${u}`);let y=[];for(let E=0;E<a.length;++E)E<d?y.push(a[E]):y.push(1);let w=_e(f),$=["type","type"],b=[{type:12,data:p},{type:1,data:f},{type:12,data:Math.floor(f/w)},{type:1,data:t.epsilon}];n&&$.push("type");let x=r>1,v=r>2,k=E=>{let z=Se(e[0].dataType),T=[B("x",e[0].dataType,e[0].dims,w),B("scale",s.dataType,s.dims,w)];n&&T.push(B("bias",n.dataType,n.dims,w)),T.push(F("output",e[0].dataType,l,w)),x&&T.push(F("mean_data_output",1,y)),v&&T.push(F("inv_std_output",1,y));let M=[{name:"norm_count",type:"u32"},{name:"norm_size",type:"f32"},{name:"norm_size_vectorized",type:"u32"},{name:"epsilon",type:"f32"}];return`
  ${E.registerUniforms(M).declareVariables(...T)}
  ${E.mainStart()}
    ${E.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.norm_count")}
    let offset = global_idx * uniforms.norm_size_vectorized;
    var mean_vector = ${ra("f32",w)};
    var mean_square_vector = ${ra("f32",w)};

    for (var h: u32 = 0u; h < uniforms.norm_size_vectorized; h++) {
      let value = ${Mt(z,w,"x[h + offset]")};
      mean_vector += value;
      mean_square_vector += value * value;
    }
    let mean = ${ht("mean_vector",w)} / uniforms.norm_size;
    let inv_std_dev = inverseSqrt(${ht("mean_square_vector",w)} / uniforms.norm_size ${i?"":"- mean * mean"} + uniforms.epsilon);

    for (var j: u32 = 0; j < uniforms.norm_size_vectorized; j++) {
      let f32input = ${Mt(z,w,"x[j + offset]")};
      let f32scale = ${Mt(z,w,"scale[j]")};
      output[j + offset] = ${T[0].type.value}((f32input ${i?"":"- mean"}) * inv_std_dev * f32scale
        ${n?`+ ${Mt(z,w,"bias[j]")}`:""}
      );
    }

    ${x?"mean_data_output[global_idx] = mean":""};
    ${v?"inv_std_output[global_idx] = inv_std_dev":""};
  }`},S=[{dims:l,dataType:e[0].dataType}];return x&&S.push({dims:y,dataType:1}),v&&S.push({dims:y,dataType:1}),{name:"LayerNormalization",shaderCache:{hint:`${w};${r};${i}`,inputDependencies:$},getRunData:()=>({outputs:S,dispatchGroup:{x:Math.ceil(p/64)},programUniforms:b}),getShaderSource:k}},fh=(e,t)=>{xu(e.inputs),e.compute(Su(e.inputs,t,e.outputCount))}}),ku,Eu,Cu,mh,gh,vm=D(()=>{X(),te(),be(),re(),ku=(e,t)=>{if(e.length<3||e.length>4)throw new Error("MatMulNBits requires 3 or 4 inputs");let r=e[0],i=r.dims.length;if(r.dims[i-1]!==t.k)throw new Error("The last dim of input shape does not match the k value");let a=Math.floor((t.k+t.blockSize-1)/t.blockSize),s=t.blockSize/8*t.bits,n=e[1];if(!O.areEqual(n.dims,[t.n,a,s]))throw new Error("The second inputs must be 3D tensor with shape N X nBlocksPerCol X blobSize");let l=e[2].dims;if(O.size(l)!==t.n*a)throw new Error("scales input size error.");if(e.length===4){let d=e[3].dims,p=t.bits>4?t.n*a:t.n*Math.floor((a+1)/2);if(O.size(d)!==p)throw new Error("zeroPoints input size error.")}},Eu=(e,t)=>{let r=e[0].dims,i=r.length,a=r[i-2],s=t.k,n=t.n,l=r.slice(0,i-2),d=O.size(l),p=e[1].dims[2]/4,f=e[0].dataType,c=_e(t.k),u=_e(p),y=_e(n),w=l.concat([a,n]),$=a>1&&n/y%2===0?2:1,b=O.size(w)/y/$,x=64,v=[],k=[d,a,s/c],S=O.convertShape(e[1].dims).slice();S.splice(-1,1,p/u),v.push(...L(k)),v.push(...L(S)),v.push(...L(e[2].dims)),e.length===4&&v.push(...L(O.convertShape(e[3].dims)));let E=[d,a,n/y];v.push(...L(E));let z=T=>{let M=k.length,W=B("a",e[0].dataType,M,c),V=B("b",12,S.length,u),J=B("scales",e[2].dataType,e[2].dims.length),ee=[W,V,J],H=e.length===4?B("zero_points",12,e[3].dims.length):void 0;H&&ee.push(H);let oe=E.length,he=F("output",e[0].dataType,oe,y),ie=Se(e[0].dataType),de=(()=>{switch(c){case 1:return`array<${ie}, 8>`;case 2:return`mat4x2<${ie}>`;case 4:return`mat2x4<${ie}>`;default:throw new Error(`${c}-component is not supported.`)}})(),j=()=>{let A=`
          // reuse a data
            var input_offset = ${W.indicesToOffset(`${W.type.indices}(batch, row, word_offset)`)};
            var a_data: ${de};
            for (var j: u32 = 0; j < ${8/c}; j++) {
              a_data[j] = ${W.getByOffset("input_offset")};
              input_offset++;
            }
          `;for(let U=0;U<y*$;U++)A+=`
            b_value = ${u===1?`b${U}_data`:`b${U}_data[i]`};
            b_value_lower = unpack4xU8(b_value & b_mask);
            b_value_upper = unpack4xU8((b_value >> 4) & b_mask);
            b_quantized_values = ${de}(${Array.from({length:4},(Q,ue)=>`${ie}(b_value_lower[${ue}]), ${ie}(b_value_upper[${ue}])`).join(", ")});
            b_dequantized_values = ${c===1?`${de}(${Array.from({length:8},(Q,ue)=>`(b_quantized_values[${ue}] - ${H?`zero_point${U}`:"zero_point"}) * scale${U}`).join(", ")});`:`(b_quantized_values - ${de}(${Array(8).fill(`${H?`zero_point${U}`:"zero_point"}`).join(",")})) * scale${U};`};
            workgroup_shared[local_id.x * ${$} + ${Math.floor(U/y)}]${y>1?`[${U%y}]`:""} += ${Array.from({length:8/c},(Q,ue)=>`${c===1?`a_data[${ue}] * b_dequantized_values[${ue}]`:`dot(a_data[${ue}], b_dequantized_values[${ue}])`}`).join(" + ")};
          `;return A},Z=()=>{let A=`
            var col_index = col * ${y};
            ${H?`
            let zero_point_bytes_per_col = (nBlocksPerCol + 1) / 2;
            var zero_point_byte_count: u32;
            var zero_point_word_index: u32;
            var zero_point_byte_offset: u32;
            let zero_point_nibble_offset: u32 = block & 0x1u;
            var zero_point_bits_offset: u32;
            var zero_point_word: u32;`:`
            // The default zero point is 8 for unsigned 4-bit quantization.
            let zero_point = ${ie}(8);`}
            `;for(let U=0;U<y*$;U++)A+=`
            let scale${U} = ${J.getByOffset("col_index * nBlocksPerCol + block")};
            ${H?`
            zero_point_byte_count = col_index * zero_point_bytes_per_col + (block >> 0x1u);
            zero_point_word_index = zero_point_byte_count >> 0x2u;
            zero_point_byte_offset = zero_point_byte_count & 0x3u;
            zero_point_bits_offset = (zero_point_byte_offset << 3) + (zero_point_nibble_offset << 2);
            zero_point_word = ${H.getByOffset("zero_point_word_index")} >> zero_point_bits_offset;
            let zero_point${U} = ${ie}((zero_point_word) & 0xFu);`:""}
            col_index += 1;`;return A},ne=()=>{let A=`col_index = col * ${y};`;for(let U=0;U<y*$;U++)A+=`
            let b${U}_data = ${V.getByIndices(`${V.type.indices}(col_index, block, word)`)};
            col_index += 1;`;return A+=`
            var b_value: u32;
            let b_mask: u32 = 0x0F0F0F0Fu;
            var b_value_lower: vec4<u32>;
            var b_value_upper: vec4<u32>;
            var b_quantized_values: ${de};
            var b_dequantized_values: ${de};`,A};return`
        var<workgroup> workgroup_shared: array<${he.type.value}, ${$*x}>;
        ${T.declareVariables(...ee,he)}
        ${T.mainStart([x,1,1])}
          let output_indices = ${he.offsetToIndices(`(global_idx / ${x}) * ${$}`)};
          let col = output_indices[2];
          let row = output_indices[1];
          let batch = output_indices[0];
          let nBlocksPerCol = uniforms.b_shape[1];

          for (var block = local_id.x; block < nBlocksPerCol; block += ${x}) {
            //process one block
            var word_offset: u32 = block * ${t.blockSize/c};
            ${Z()}
            for (var word: u32 = 0; word < ${p}; word += ${u}) {
              ${ne()}
              for (var i: u32 = 0; i < ${u}; i++) {
                ${j()}
                word_offset += ${8/c};
              }
            }
          }
          workgroupBarrier();

          if (local_id.x < ${$}) {
            var output_value: ${he.type.value} = ${he.type.value}(0);
            var workgroup_shared_offset: u32 = local_id.x;
            for (var b: u32 = 0u; b < ${x}u; b++) {
              output_value += workgroup_shared[workgroup_shared_offset];
              workgroup_shared_offset += ${$};
            }
            ${he.setByIndices(`${he.type.indices}(batch, row, col + local_id.x)`,"output_value")};
          }
        }`};return{name:"MatMulNBits",shaderCache:{hint:`${t.blockSize};${t.bits};${c};${u};${y};${$};${x}`,inputDependencies:Array(e.length).fill("rank")},getRunData:()=>({outputs:[{dims:w,dataType:f}],dispatchGroup:{x:b},programUniforms:v}),getShaderSource:z}},Cu=(e,t)=>{let r=e[0].dims,i=r.length,a=r[i-2],s=t.k,n=t.n,l=r.slice(0,i-2),d=O.size(l),p=e[1].dims[2]/4,f=e[0].dataType,c=_e(t.k),u=_e(p),y=l.concat([a,n]),w=128,$=n%8===0?8:n%4===0?4:1,b=w/$,x=b*u*8,v=x/c,k=x/t.blockSize,S=O.size(y)/$,E=[],z=[d,a,s/c],T=O.convertShape(e[1].dims).slice();T.splice(-1,1,p/u),E.push(...L(z)),E.push(...L(T)),E.push(...L(e[2].dims)),e.length===4&&E.push(...L(O.convertShape(e[3].dims)));let M=[d,a,n];E.push(...L(M));let W=V=>{let J=z.length,ee=B("a",e[0].dataType,J,c),H=B("b",12,T.length,u),oe=B("scales",e[2].dataType,e[2].dims.length),he=[ee,H,oe],ie=e.length===4?B("zero_points",12,e[3].dims.length):void 0;ie&&he.push(ie);let de=M.length,j=F("output",e[0].dataType,de),Z=Se(e[0].dataType),ne=()=>{switch(c){case 1:return`
          let a_data0 = vec4<${Z}>(sub_a[word_offset], sub_a[word_offset + 1], sub_a[word_offset + 2], sub_a[word_offset + 3]);
          let a_data1 = vec4<${Z}>(sub_a[word_offset + 4], sub_a[word_offset + 5], sub_a[word_offset + 6], sub_a[word_offset + 7]);`;case 2:return`
          let a_data0 = vec4<${Z}>(sub_a[word_offset], sub_a[word_offset + 1]);
          let a_data1 = vec4<${Z}>(sub_a[word_offset + 2], sub_a[word_offset + 3]);`;case 4:return`
          let a_data0 = sub_a[word_offset];
          let a_data1 = sub_a[word_offset + 1];`;default:throw new Error(`${c}-component is not supported.`)}};return`
        var<workgroup> sub_a: array<${ee.type.value}, ${v}>;
        var<workgroup> inter_results: array<array<${j.type.value}, ${b}>, ${$}>;
        ${V.declareVariables(...he,j)}
        ${V.mainStart([b,$,1])}
          let output_indices = ${j.offsetToIndices(`workgroup_index * ${$}`)};
          let col = output_indices[2];
          let row = output_indices[1];
          let batch = output_indices[0];
          let n_blocks_per_col = uniforms.b_shape[1];
          let num_tiles =  (n_blocks_per_col - 1) / ${k} + 1;

          // Loop over shared dimension.
          for (var tile: u32 = 0; tile < num_tiles; tile += 1) {
            let a_col_start = tile * ${v};
            // load one tile A data into shared memory.
            for (var a_offset = local_idx; a_offset < ${v}; a_offset += ${w})
            {
              let a_col = a_col_start + a_offset;
              if (a_col < uniforms.a_shape[2])
              {
                sub_a[a_offset] = ${ee.getByIndices(`${ee.type.indices}(batch, row, a_col)`)};
              } else {
                sub_a[a_offset] = ${ee.type.value}(0);
              }
            }
            workgroupBarrier();

            // each thread process one block
            let b_row = col + local_id.y;
            let block = tile * ${k} + local_id.x;
            ${ie?`
            let zero_point_bytes_per_col = (n_blocks_per_col + 1) / 2;
            let zero_point_byte_count = b_row * zero_point_bytes_per_col + (block >> 0x1u);
            let zero_point_word_index = zero_point_byte_count >> 0x2u;
            let zero_point_byte_offset = zero_point_byte_count & 0x3u;
            let zero_point_nibble_offset: u32 = block & 0x1u;
            let zero_point_bits_offset = (zero_point_byte_offset << 3) + (zero_point_nibble_offset << 2);
            let zero_point_word = ${ie.getByOffset("zero_point_word_index")} >> zero_point_bits_offset;
            let zero_point = ${Z}((zero_point_word) & 0xFu);`:`
            // The default zero point is 8 for unsigned 4-bit quantization.
            let zero_point = ${Z}(8);`}
            let scale = ${oe.getByOffset("b_row * n_blocks_per_col + block")};
            let b_data = ${H.getByIndices(`${H.type.indices}(b_row, block, 0)`)};
            var word_offset = local_id.x * ${t.blockSize/c};
            for (var i: u32 = 0; i < ${u}; i++) {
              ${ne()}
              let b_value = ${u===1?"b_data":"b_data[i]"};
              let b_value_lower = unpack4xU8(b_value & 0x0F0F0F0Fu);
              let b_value_upper = unpack4xU8((b_value >> 4) & 0x0F0F0F0Fu);
              let b_quantized_values = mat2x4<${Z}>(${Array.from({length:4},(A,U)=>`${Z}(b_value_lower[${U}]), ${Z}(b_value_upper[${U}])`).join(", ")});
              let b_dequantized_values = (b_quantized_values - mat2x4<${Z}>(${Array(8).fill("zero_point").join(",")})) * scale;
              inter_results[local_id.y][local_id.x] += ${Array.from({length:2},(A,U)=>`${`dot(a_data${U}, b_dequantized_values[${U}])`}`).join(" + ")};
              word_offset += ${8/c};
            }
            workgroupBarrier();
          }

          if (local_idx < ${$}) {
            var output_value: ${j.type.value} = ${j.type.value}(0);
            for (var b = 0u; b < ${b}; b++) {
              output_value += inter_results[local_idx][b];
            }
            if (col + local_idx < uniforms.output_shape[2])
            {
              ${j.setByIndices(`${j.type.indices}(batch, row, col + local_idx)`,"output_value")}
            }
          }
        }`};return{name:"BlockwiseMatMulNBits32",shaderCache:{hint:`${t.blockSize};${c};${u};${b};${$}`,inputDependencies:Array(e.length).fill("rank")},getRunData:()=>({outputs:[{dims:y,dataType:f}],dispatchGroup:{x:S},programUniforms:E}),getShaderSource:W}},mh=(e,t)=>{ku(e.inputs,t),t.blockSize===32&&e.adapterInfo.isVendor("intel")&&e.adapterInfo.isArchitecture("gen-12lp")?e.compute(Cu(e.inputs,t)):e.compute(Eu(e.inputs,t))},gh=e=>fe(e)}),Tu,Iu,zu,Au,Ou,Ru,Bu,Mu,yh,bm=D(()=>{X(),te(),re(),Tu=e=>{if(!e||e.length<1)throw new Error("Too few inputs");if(e[0].dataType!==1&&e[0].dataType!==10)throw new Error("Input type must be float or float16.");if(e.length>=2){let t=e[0].dims.length*2===e[1].dims[0];if(e.length===4&&(t=e[3].dims[0]*2===e[1].dims[0]),!t)throw new Error("The pads should be a 1D tensor of shape [2 * input_rank] or [2 * num_axes].")}},Iu=(e,t,r)=>{let i="";for(let a=t-1;a>=0;--a)i+=`
            k = i32(${e.indicesGet("indices",a)}) - ${G("uniforms.pads",a,r)};
            if (k < 0) {
              break;
            }
            if (k >= i32(${G("uniforms.x_shape",a,t)})) {
              break;
            }
            offset += k * i32(${G("uniforms.x_strides",a,t)});
        `;return`
          value = ${e.type.value}(uniforms.constant_value);
          for (var i = 0; i < 1; i++) {
            var offset = 0;
            var k = 0;
            ${i}
            value = x[offset];
          }
      `},zu=(e,t,r)=>{let i="";for(let a=t-1;a>=0;--a)i+=`
                k = i32(${e.indicesGet("indices",a)}) - ${G("uniforms.pads",a,r)};
                if (k < 0) {
                  k = -k;
                }
                {
                  let _2n_1 = 2 * (i32(${G("uniforms.x_shape",a,t)}) - 1);
                  k = k % _2n_1;
                  if(k >= i32(${G("uniforms.x_shape",a,t)})) {
                    k = _2n_1 - k;
                  }
                }
                offset += k * i32(${G("uniforms.x_strides",a,t)});
            `;return`
              var offset = 0;
              var k = 0;
              ${i}
              value = x[offset];
          `},Au=(e,t,r)=>{let i="";for(let a=t-1;a>=0;--a)i+=`
                k = i32(${e.indicesGet("indices",a)}) - ${G("uniforms.pads",a,r)};
                if (k < 0) {
                  k = 0;
                }
                if (k >= i32(${G("uniforms.x_shape",a,t)})) {
                  k = i32(${G("uniforms.x_shape",a,t)}) - 1;
                }
                offset += k * i32(${G("uniforms.x_strides",a,t)});
            `;return`
              var offset = 0;
              var k = 0;
              ${i}
              value = x[offset];
          `},Ou=(e,t,r)=>{let i="";for(let a=t-1;a>=0;--a)i+=`
                k = i32(${e.indicesGet("indices",a)}) - ${G("uniforms.pads",a,r)};
                if (k < 0)  {
                  k += i32(${G("uniforms.x_shape",a,t)}]);
                }
                if (k >= i32(${G("uniforms.x_shape",a,t)})) {
                  k -= i32(${G("uniforms.x_shape",a,t)});
                }
                offset += k * i32(${G("uniforms.x_strides",a,t)});
            `;return`
              var offset = 0;
              var k = 0;
              ${i}
              value = x[offset];
          `},Ru=(e,t,r)=>{switch(r.mode){case 0:return Iu(e,t,r.pads.length);case 1:return zu(e,t,r.pads.length);case 2:return Au(e,t,r.pads.length);case 3:return Ou(e,t,r.pads.length);default:throw new Error("Invalid mode")}},Bu=(e,t)=>{let r=O.padShape(e[0].dims.slice(),t.pads),i=e[0].dims,a=O.size(r),s=[{type:12,data:a},{type:6,data:t.pads}],n=e.length>=3&&e[2].data;t.mode===0&&s.push({type:n?e[2].dataType:1,data:t.value}),s.push(...L(e[0].dims,r));let l=["rank"],d=p=>{let f=F("output",e[0].dataType,r.length),c=B("x",e[0].dataType,i.length),u=c.type.value,y=Ru(f,i.length,t),w=[{name:"output_size",type:"u32"},{name:"pads",type:"i32",length:t.pads.length}];return t.mode===0&&w.push({name:"constant_value",type:n?u:"f32"}),`
            ${p.registerUniforms(w).declareVariables(c,f)}
            ${p.mainStart()}
            ${p.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

            let indices = ${f.offsetToIndices("global_idx")};

            var value = ${u}(0);
            ${y}
            output[global_idx] = value;
        }`};return{name:"Pad",shaderCache:{hint:`${t.mode}${n}`,inputDependencies:l},getRunData:()=>({outputs:[{dims:r,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(O.size(r)/64)},programUniforms:s}),getShaderSource:d}},Mu=(e,t)=>{if(e.length>1){let r=e[1].getBigInt64Array(),i=e.length>=3&&e[2].data?e[2].dataType===10?e[2].getUint16Array()[0]:e[2].getFloat32Array()[0]:0,a=e[0].dims.length,s=new Int32Array(2*a).fill(0);if(e.length>=4){let l=e[3].getBigInt64Array();for(let d=0;d<l.length;d++)s[Number(l[d])]=Number(r[d]),s[Number(l[d])+a]=Number(r[d+l.length])}else r.forEach((l,d)=>s[Number(d)]=Number(l));let n=[];return s.forEach(l=>n.push(l)),{mode:t.mode,value:i,pads:n}}else return t},yh=(e,t)=>{Tu(e.inputs);let r=Mu(e.inputs,t);e.compute(Bu(e.inputs,r),{inputs:[0]})}}),Lt,Ui,Ni,Wi,qi,Pu,Du,Vi,Li,wh,$h,ji,_h,vh,Gi,bh,xh,Sh,kh,xm=D(()=>{Ke(),X(),te(),re(),Lt=e=>{if(me.webgpu.validateInputContent&&(!e||e.length!==1))throw new Error("Pool ops requires 1 input.")},Ui=(e,t,r)=>{let i=t.format==="NHWC",a=e.dims.slice();i&&a.splice(1,0,a.pop());let s=Object.hasOwnProperty.call(t,"dilations"),n=t.kernelShape.slice(),l=t.strides.slice(),d=s?t.dilations.slice():[],p=t.pads.slice();Rr.adjustPoolAttributes(r,a,n,l,d,p);let f=Rr.computePoolOutputShape(r,a,l,d,n,p,t.autoPad),c=Object.assign({},t);s?Object.assign(c,{kernelShape:n,strides:l,pads:p,dilations:d,cacheKey:t.cacheKey}):Object.assign(c,{kernelShape:n,strides:l,pads:p,cacheKey:t.cacheKey});let u=f.slice();return u.push(u.splice(1,1)[0]),[c,i?u:f]},Ni=(e,t)=>{let r=t.format==="NHWC",i=O.size(e),a=O.size(t.kernelShape),s=[{type:12,data:i},{type:12,data:a}],n=[{name:"outputSize",type:"u32"},{name:"kernelSize",type:"u32"}];if(t.kernelShape.length<=2){let l=t.kernelShape[t.kernelShape.length-1],d=t.strides[t.strides.length-1],p=t.pads[t.pads.length/2-1],f=t.pads[t.pads.length-1],c=!!(p+f);s.push({type:12,data:l},{type:12,data:d},{type:12,data:p},{type:12,data:f}),n.push({name:"kw",type:"u32"},{name:"sw",type:"u32"},{name:"pwStart",type:"u32"},{name:"pwEnd",type:"u32"});let u=!1;if(t.kernelShape.length===2){let y=t.kernelShape[t.kernelShape.length-2],w=t.strides[t.strides.length-2],$=t.pads[t.pads.length/2-2],b=t.pads[t.pads.length-2];u=!!($+b),s.push({type:12,data:y},{type:12,data:w},{type:12,data:$},{type:12,data:b}),n.push({name:"kh",type:"u32"},{name:"sh",type:"u32"},{name:"phStart",type:"u32"},{name:"phEnd",type:"u32"})}return[s,n,!0,c,u]}else{if(r)throw new Error("Pooling with kernelShape.length > 2 is not supported for NHWC format.");let l=O.computeStrides(t.kernelShape);s.push({type:12,data:l},{type:12,data:t.pads},{type:12,data:t.strides}),n.push({name:"kernelStrides",type:"u32",length:l.length},{name:"pads",type:"u32",length:t.pads.length},{name:"strides",type:"u32",length:t.strides.length});let d=t.pads.reduce((p,f)=>p+f);return[s,n,!!d,!1,!1]}},Wi=(e,t,r,i,a,s,n,l,d,p,f,c)=>{let u=a.format==="NHWC",y=t.type.value,w=F("output",t.type.tensor,i);if(a.kernelShape.length<=2){let $="",b="",x="",v=r-(u?2:1);if(f?$=`
                for (var i: u32 = 0u; i < uniforms.kw; i++) {
                  xIndices[${v}] = indices[${v}] * uniforms.sw - uniforms.pwStart + i;
                  if (xIndices[${v}] < 0 || xIndices[${v}]
                      >= uniforms.x_shape[${v}]) {
                    pad++;
                    continue;
                  }
                  let x_val = x[${t.indicesToOffset("xIndices")}];
                  ${s}
                }`:$=`
                for (var i: u32 = 0u; i < uniforms.kw; i++) {
                  xIndices[${v}] = indices[${v}] * uniforms.sw - uniforms.pwStart + i;
                  let x_val = x[${t.indicesToOffset("xIndices")}];
                  ${s}
                }`,a.kernelShape.length===2){let k=r-(u?3:2);c?b=`
                for (var j: u32 = 0u; j < uniforms.kh; j++) {
                  xIndices[${k}] = indices[${k}] * uniforms.sh - uniforms.phStart + j;
                  if (xIndices[${k}] < 0 || xIndices[${k}] >= uniforms.x_shape[${k}]) {
                    pad += i32(uniforms.kw);
                    continue;
                  }
              `:b=`
                for (var j: u32 = 0u; j < uniforms.kh; j++) {
                  xIndices[${k}] = indices[${k}] * uniforms.sh - uniforms.phStart + j;
                `,x=`
              }
            `}return`
            ${e.registerUniforms(d).declareVariables(t,w)}

            ${e.mainStart()}
              ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}

              let indices = ${w.offsetToIndices("global_idx")};
              var xIndices = ${w.offsetToIndices("global_idx")};

              var value = ${y}(${l});
              var pad = 0;
              ${b}
              ${$}
              ${x}
              ${n}

              output[global_idx] = value;
            }`}else{if(u)throw new Error("Pooling with kernelShape.length > 2 is not supported for NHWC format.");let $=a.kernelShape.length,b=a.pads.length,x="";return p?x=`
                if (xIndices[j] >= uniforms.x_shape[j]) {
                  pad++;
                  isPad = true;
                  break;
                }
              }
              if (!isPad) {
                let x_val = x[${t.indicesToOffset("xIndices")}];
                ${s}
              }`:x=`
              }
              let x_val = x[${t.indicesToOffset("xIndices")}];
              ${s}
            `,`
            ${e.registerUniforms(d).declareVariables(t,w)}

            ${e.mainStart()}
              ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
              let indices = ${w.offsetToIndices("global_idx")};
              var xIndices = ${w.offsetToIndices("global_idx")};

              var offsets: array<u32, ${$}>;

              var value = ${y}(${l});
              var pad = 0;
              var isPad = false;

              for (var i: u32 = 0u; i < uniforms.kernelSize; i++) {
                var offset = i;
                for (var j = 0u; j < ${$-1}u; j++) {
                  offsets[j] = offset / ${G("uniforms.kernelStrides","j",$)};
                  offset -= offsets[j] * ${G("uniforms.kernelStrides","j",$)};
                }
                offsets[${$-1}] = offset;

                isPad = false;
                for (var j = ${r-$}u; j < ${r}u; j++) {
                  xIndices[j] = indices[j] * ${G("uniforms.strides",`j - ${r-$}u`,$)}
                    + offsets[j - ${r-$}u] - ${G("uniforms.pads","j - 2u",b)};
                  ${x}
              }
              ${n}

              output[global_idx] = value;
            }`}},qi=e=>`${e.format};${e.ceilMode};${e.autoPad};${e.kernelShape.length}`,Pu=e=>`${qi(e)};${e.countIncludePad}`,Du=e=>`${qi(e)};${e.storageOrder};${e.dilations}`,Vi=e=>({format:e.format,autoPad:["NOTSET","VALID","SAME_UPPER","SAME_LOWER"][e.auto_pad],ceilMode:e.ceil_mode,kernelShape:e.kernel_shape,strides:e.strides,pads:e.pads}),Li=(e,t,r,i)=>{let[a,s]=Ui(t,i,r),n=B("x",t.dataType,t.dims.length),l=n.type.value,d="value += x_val;",p="";a.countIncludePad?p+=`value /= ${l}(uniforms.kernelSize);`:p+=`value /= ${l}(i32(uniforms.kernelSize) - pad);`;let[f,c,u,y,w]=Ni(s,a);f.push(...L(t.dims,s));let $=["rank"];return{name:e,shaderCache:{hint:`${i.cacheKey};${u};${y};${w}`,inputDependencies:$},getRunData:()=>({outputs:[{dims:s,dataType:t.dataType}],dispatchGroup:{x:Math.ceil(O.size(s)/64)},programUniforms:f}),getShaderSource:b=>Wi(b,n,t.dims.length,s.length,a,d,p,0,c,u,y,w)}},wh=e=>{let t=e.count_include_pad!==0,r=Vi(e);if(r.ceilMode!==0)throw new Error("using ceil() in shape computation is not yet supported for AveragePool");let i={countIncludePad:t,...r,cacheKey:""};return{...i,cacheKey:Pu(i)}},$h=(e,t)=>{Lt(e.inputs),e.compute(Li("AveragePool",e.inputs[0],!1,t))},ji={autoPad:"",ceilMode:0,countIncludePad:!1,kernelShape:[],strides:[],pads:[],storageOrder:0,dilations:[]},_h=e=>{let t=e.format;return{format:t,...ji,cacheKey:t}},vh=(e,t)=>{Lt(e.inputs),e.compute(Li("GlobalAveragePool",e.inputs[0],!0,t))},Gi=(e,t,r,i)=>{let[a,s]=Ui(t,i,r),n=`
      value = max(x_val, value);
    `,l="",d=B("x",t.dataType,t.dims.length),p=["rank"],[f,c,u,y,w]=Ni(s,a);return f.push(...L(t.dims,s)),{name:e,shaderCache:{hint:`${i.cacheKey};${u};${y};${w}`,inputDependencies:p},getRunData:()=>({outputs:[{dims:s,dataType:t.dataType}],dispatchGroup:{x:Math.ceil(O.size(s)/64)},programUniforms:f}),getShaderSource:$=>Wi($,d,t.dims.length,s.length,a,n,l,t.dataType===10?-65504:-1e5,c,u,y,w)}},bh=(e,t)=>{Lt(e.inputs),e.compute(Gi("MaxPool",e.inputs[0],!1,t))},xh=e=>{let t=e.storage_order,r=e.dilations,i=Vi(e);if(t!==0)throw new Error("column major storage order is not yet supported for MaxPool");if(i.ceilMode!==0)throw new Error("using ceil() in shape computation is not yet supported for MaxPool");let a={storageOrder:t,dilations:r,...i,cacheKey:""};return{...a,cacheKey:Du(a)}},Sh=e=>{let t=e.format;return{format:t,...ji,cacheKey:t}},kh=(e,t)=>{Lt(e.inputs),e.compute(Gi("GlobalMaxPool",e.inputs[0],!0,t))}}),Uu,Nu,Eh,Ch,Sm=D(()=>{X(),te(),be(),re(),Uu=(e,t)=>{if(e.length<2||e.length>3)throw new Error("DequantizeLinear requires 2 or 3 inputs.");if(e.length===3&&e[1].dims===e[2].dims)throw new Error("x-scale and x-zero-point must have the same shape.");if(e.length===3&&e[0].dataType!==e[2].dataType)throw new Error("x and x-zero-point must have the same data type.");if(e[0].dataType===6&&e.length>2)throw new Error("In the case of dequantizing int32 there is no zero point.");if(e[1].dims.length!==0&&e[1].dims.length!==1&&e[1].dims.length!==e[0].dims.length)throw new Error("scale input must be a scalar, a 1D tensor, or have the same rank as the input tensor.");if(e.length>2){if(e[0].dataType!==e[2].dataType)throw new Error("x and x-zero-point must have the same data type.");if(e[1].dims.length!==e[2].dims.length)throw new Error("scale and zero-point inputs must have the same rank.");if(!e[1].dims.map((r,i)=>r===e[2].dims[i]).reduce((r,i)=>r&&i,!0))throw new Error("scale and zero-point inputs must have the same shape.")}if(t.blockSize>0){if(e[1].dims.length===0||e[1].dims.length===1&&e[1].dims[0]===1)throw new Error("blockSize must be set only for block quantization.");if(!e[1].dims.map((a,s)=>s===t.axis||a===e[0].dims[s]).reduce((a,s)=>a&&s,!0))throw new Error("For block qunatization, scale input shape to match the input shape except for the axis");if(e[1].dims.length!==e[0].dims.length)throw new Error("For block qunatization the scale input rank must be the same as the x rank.");let r=e[0].dims[t.axis],i=e[1].dims[t.axis];if(t.blockSize<Math.ceil(r/i)||t.blockSize>Math.ceil(r/(i-1)-1))throw new Error("blockSize must be with in the range [ceil(dI / Si), ceil(dI / (Si - 1) - 1)].")}},Nu=(e,t)=>{let r=O.normalizeAxis(t.axis,e[0].dims.length),i=e[0].dataType,a=i===3,s=e[0].dims,n=e[1].dataType,l=O.size(s),d=i===3||i===2,p=d?[Math.ceil(O.size(e[0].dims)/4)]:e[0].dims,f=e[1].dims,c=e.length>2?e[2]:void 0,u=c?d?[Math.ceil(O.size(c.dims)/4)]:c.dims:void 0,y=f.length===0||f.length===1&&f[0]===1,w=y===!1&&f.length===1,$=_e(l),b=y&&(!d||$===4),x=b?$:1,v=b&&!d?$:1,k=B("input",d?12:i,p.length,v),S=B("scale",n,f.length),E=c?B("zero_point",d?12:i,u.length):void 0,z=F("output",n,s.length,x),T=[k,S];E&&T.push(E);let M=[p,f];c&&M.push(u);let W=[{type:12,data:l/x},{type:12,data:r},{type:12,data:t.blockSize},...L(...M,s)],V=J=>{let ee=[{name:"output_size",type:"u32"},{name:"axis",type:"u32"},{name:"block_size",type:"u32"}];return`
      ${J.registerUniforms(ee).declareVariables(...T,z)}
      ${J.mainStart()}
          ${J.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
          let output_indices = ${z.offsetToIndices("global_idx")};

          // Set input x
          ${d?`
            let input = ${k.getByOffset("global_idx / 4")};
            let x_vec = ${a?"unpack4xI8(input)":"unpack4xU8(input)"};
            let x_value = ${x===1?"x_vec[global_idx % 4]":"x_vec"};`:`let x_value = ${k.getByOffset("global_idx")};`};

          // Set scale input
          ${y?`let scale_value= ${S.getByOffset("0")}`:w?`
            let scale_index = ${z.indicesGet("output_indices","uniforms.axis")};
            let scale_value= ${S.getByOffset("scale_index")};`:`
            var scale_indices: ${S.type.indices} = output_indices;
            let index = ${S.indicesGet("scale_indices","uniforms.axis")} / uniforms.block_size;
            ${S.indicesSet("scale_indices","uniforms.axis","index")};
            let scale_value= ${S.getByIndices("scale_indices")};`};

          // Set zero-point input
          ${E?y?d?`
                let zero_point_input = ${E.getByOffset("0")};
                let zero_point_vec =  ${a?"unpack4xI8(zero_point_input)":"unpack4xU8(zero_point_input)"};
                let zero_point_value= zero_point_vec[0]`:`let zero_point_value = ${E.getByOffset("0")}`:w?d?`
                let zero_point_index = ${z.indicesGet("output_indices","uniforms.axis")};
                let zero_point_input = ${E.getByOffset("zero_point_index / 4")};
                let zero_point_vec =  ${a?"unpack4xI8(zero_point_input)":"unpack4xU8(zero_point_input)"};
                let zero_point_value = zero_point_vec[zero_point_index % 4]`:`
                let zero_point_index = ${z.indicesGet("output_indices","uniforms.axis")};
                let zero_point_value = ${E.getByOffset("zero_point_index")};`:d?`
                let zero_point_offset = ${S.indicesToOffset("scale_indices")};
                let zero_point_input = ${E.getByOffset("zero_point_offset / 4")};
                let zero_point_vec = ${a?"unpack4xI8(zero_point_input)":"unpack4xU8(zero_point_input)"};
                let zero_point_value = zero_point_vec[zero_point_offset % 4];`:`let zero_point_value = ${E.getByIndices("scale_indices")};`:`let zero_point_value = ${d?a?"i32":"u32":k.type.value}(0);`};
      // Compute and write output
      ${z.setByOffset("global_idx",`${z.type.value}(x_value - zero_point_value) * scale_value`)};
      }`};return{name:"DequantizeLinear",shaderCache:{hint:t.cacheKey,inputDependencies:E?["rank","rank","rank"]:["rank","rank"]},getShaderSource:V,getRunData:()=>({outputs:[{dims:s,dataType:n}],dispatchGroup:{x:Math.ceil(l/x/64),y:1,z:1},programUniforms:W})}},Eh=(e,t)=>{Uu(e.inputs,t),e.compute(Nu(e.inputs,t))},Ch=e=>fe({axis:e.axis,blockSize:e.blockSize})}),Wu,qu,Th,km=D(()=>{Ke(),X(),re(),Wu=(e,t,r)=>{let i=e===t,a=e<t&&r<0,s=e>t&&r>0;if(i||a||s)throw new Error("Range these inputs' contents are invalid.")},qu=(e,t,r,i)=>{let a=Math.abs(Math.ceil((t-e)/r)),s=[a],n=a,l=[{type:12,data:n},{type:i,data:e},{type:i,data:r},...L(s)],d=p=>{let f=F("output",i,s.length),c=f.type.value,u=[{name:"outputSize",type:"u32"},{name:"start",type:c},{name:"delta",type:c}];return`
        ${p.registerUniforms(u).declareVariables(f)}
        ${p.mainStart()}
        ${p.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
        output[global_idx] = uniforms.start + ${c}(global_idx) * uniforms.delta;
      }`};return{name:"Range",shaderCache:{hint:`${i}`},getShaderSource:d,getRunData:()=>({outputs:[{dims:s,dataType:i}],dispatchGroup:{x:Math.ceil(n/64)},programUniforms:l})}},Th=e=>{let t=0,r=0,i=0;e.inputs[0].dataType===6?(t=e.inputs[0].getInt32Array()[0],r=e.inputs[1].getInt32Array()[0],i=e.inputs[2].getInt32Array()[0]):e.inputs[0].dataType===1&&(t=e.inputs[0].getFloat32Array()[0],r=e.inputs[1].getFloat32Array()[0],i=e.inputs[2].getFloat32Array()[0]),me.webgpu.validateInputContent&&Wu(t,r,i),e.compute(qu(t,r,i,e.inputs[0].dataType),{inputs:[]})}}),Vu,Lu,ju,Gu,Fu,Hu,Ku,Yu,Zu,Qu,Xu,Fi,Ju,el,tl,rl,il,Ih,zh,Em=D(()=>{X(),te(),be(),re(),Vu=(e,t)=>{if(e.every(r=>r>0||(()=>{throw new Error("Resize requires scales input values to be positive")})),e.length>0){if(t.mode==="linear"){if(!(e.length===2||e.length===3||e.length===4&&e[0]===1&&e[1]===1||e.length===4&&e[0]===1&&e[3]===1||e.length===5&&e[0]===1&&e[1]===1))throw new Error(`For linear mode, Resize requires scales to be 2D, 3D, 4D with either two outermost or one innermost and
            one outermost scale values equal to 1, or 5D with two outermost scale values equal to 1`)}else if(t.mode==="cubic"&&!(e.length===2||e.length===4&&e[0]===1&&e[1]===1||e.length===4&&e[0]===1&&e[3]===1))throw new Error("Resize requires scales input size to be 2 or 4 for cubic mode")}},Lu=(e,t,r)=>{t.every(a=>a>=0&&a<r||(()=>{throw new Error("Resize requires axes input values to be positive and less than rank")}));let i=new Array(r).fill(1);return t.forEach((a,s)=>i[a]=e[s]),i},ju=(e,t,r,i,a,s)=>{let[n,l,d]=r>10?[1,2,3]:[-1,e.length>1?1:-1,-1],p=e[0].dims.length;if(n>0&&e.length>n&&e[n].dims.length>0)e[n].getFloat32Array().forEach(f=>s.push(f));else if(t.coordinateTransformMode==="tf_crop_and_resize")throw new Error("Resize requires RoI input to be specified when coordinateTransformMode is tfCropAndResize");if(l>0&&e.length>l&&e[l].dims.length===1&&e[l].dims[0]>0){if(e[l].getFloat32Array().forEach(f=>i.push(f)),i.length!==0&&i.length!==p&&r>=18&&i.length!==t.axes.length)throw new Error("Resize requires scales input size to be same as input rank or axes size for opset 18 and up");Vu(i,t),t.axes.length>0&&Lu(i,t.axes,p).forEach((f,c)=>i[c]=f)}if(d>0&&e.length>d&&e[d].dims.length===1&&e[d].dims[0]>0&&(e[d].getBigInt64Array().forEach(f=>a.push(Number(f))),a.length!==0&&a.length!==p&&r>=18&&a.length!==t.axes.length))throw new Error("Resize requires sizes input size to be same as input rank or axes size for opset 18 and up");if(t.axes.length>0){if(i.length!==0&&i.length!==t.axes.length)throw new Error('Resize requires "scales" input size to be of axes rank when axes attributes is specified');if(a.length!==0&&a.length!==t.axes.length)throw new Error('Resize requires "sizes" input size to be of rank axes rank when axes attributes is specified')}if(typeof i<"u"&&typeof a<"u"&&i.length>0&&a.length>p)throw new Error("Resize requires only of scales or sizes to be specified")},Gu=(e,t)=>`fn getOriginalCoordinateFromResizedCoordinate(xResized: u32, xScale: f32, lengthResized: u32,
     lengthOriginal: u32, roiStart: f32, roiEnd: f32) -> ${t} { `+(()=>{switch(e){case"asymmetric":return`return ${t}(xResized) / ${t}(xScale);`;case"pytorch_half_pixel":return`if (lengthResized > 1) {
                    return (${t}(xResized) + 0.5) / ${t}(xScale) - 0.5;
                  } else {
                    return 0.0;
                  }`;case"tf_half_pixel_for_nn":return`return (${t}(xResized) + 0.5) / ${t}(xScale);`;case"align_corners":return`if (lengthResized == 1) {
                    return 0.0;
                  } else {
                    // The whole part and the fractional part are calculated separately due to inaccuracy of floating
                    // point division. As an example, f32(21) / f32(7) may evaluate to 2.99... instead of 3, causing an
                    // offset-by-one error later in floor().
                    let whole = ${t}(xResized * (lengthOriginal - 1) / (lengthResized - 1));
                    let fract =
                        ${t}(xResized * (lengthOriginal - 1) % (lengthResized - 1)) / ${t}(lengthResized - 1);
                    return whole + fract;
                  }`;case"tf_crop_and_resize":return`if (lengthResized > 1) {
                    return ${t}(roiStart) * ${t}(lengthOriginal - 1) +
                        (${t}(xResized) * ${t}(roiEnd - roiStart) * ${t}(lengthOriginal - 1)) /
                        ${t}(lengthResized - 1);
                  } else {
                    return 0.5 * ${t}(roiStart + roiEnd) * ${t}(lengthOriginal - 1);
                  }`;case"half_pixel_symmetric":return`const outputWidth = ${t}xScale * ${t}(lengthResized);
                  const adjustment = ${t}(lengthResized) / outputWidth;
                  const center = ${t}(lengthOriginal) / 2;
                  const offset = center * (1 - adjustment);
                  return offset + ((${t}(xResized) + 0.5) / ${t}(xScale)) - 0.5;`;case"half_pixel":return`return ((${t}(xResized) + 0.5) / ${t}(xScale)) - 0.5;`;default:throw new Error(`Coordinate transform mode ${e} is not supported`)}})()+"}",Fu=(e,t,r)=>`fn getNearestPixelFromOriginal(xOriginal: ${r}, isDownSample: bool) -> ${r} {`+(()=>{switch(e){case"round_prefer_ceil":return"if (fract(xOriginal) == 0.5) {             return ceil(xOriginal);           } else {             return round(xOriginal);           }";case"floor":return"return floor(xOriginal);";case"ceil":return"return ceil(xOriginal);";case"round_prefer_floor":return"if (fract(xOriginal) == 0.5) {                     return floor(xOriginal);                   } else {                     return round(xOriginal);                   }";case"simple":default:if(t<11)return"if (isDownSample)                     {                       return ceil(xOriginal);                     } else {                       return xOriginal;                     }";throw new Error(`Nearest mode ${e} is not supported`)}})()+"}",Hu=(e,t,r)=>{let i=new Array(r).fill(0).concat(new Array(r).fill(1)),a=e.length===0?i:e.slice();return t.length>0?(t.forEach((s,n)=>{i[s]=a[n],i[n+r]=a[t.length+n]}),i):a},Ku=(e,t,r,i)=>{let a=[];if(r.length>0)if(i.length>0){if(e.forEach(s=>a.push(s)),Math.max(...i)>e.length)throw new Error("axes is out of bound");i.forEach((s,n)=>a[s]=r[n])}else r.forEach(s=>a.push(s));else{if(t.length===0)throw new Error("Resize requires either scales or sizes.");a=e.map((s,n)=>Math.round(s*t[n]))}return a},Yu=(e,t,r)=>{let i=(()=>{switch(r.keepAspectRatioPolicy){case"not_larger":return r.axes.length>0?Math.min(...r.axes.map(s=>t[s]),Number.MAX_VALUE):Math.min(...t,Number.MAX_VALUE);case"not_smaller":return r.axes.length>0?Math.max(...r.axes.map(s=>t[s]),Number.MIN_VALUE):Math.max(...t,Number.MIN_VALUE);default:throw new Error(`Keep aspect ratio policy ${r.keepAspectRatioPolicy} is not supported`)}})();t.fill(1,0,t.length);let a=e.slice();return r.axes.length>0?(r.axes.forEach(s=>t[s]=i),r.axes.forEach(s=>a[s]=Math.round(e[s]*t[s]))):(t.fill(i,0,t.length),a.forEach((s,n)=>a[n]=Math.round(s*t[n]))),a},Zu=(e,t,r,i,a)=>`
    fn calculateOriginalIndicesFromOutputIndices(output_indices: ${e.type.indices}) -> array<${e.type.value}, ${r.length}> {
      var original_indices: array<${e.type.value}, ${r.length}>;
      for (var i:u32 = 0; i < ${r.length}; i++) {
        var output_index = ${e.indicesGet("output_indices","i")};
        var scale = ${G("uniforms.scales","i",i)};
        var roi_low = ${G("uniforms.roi","i",a)};
        var roi_hi = ${G("uniforms.roi",`i + ${t.length}`,a)};
        if (scale == 1.0) {
          original_indices[i] = ${e.type.value}(output_index);
        } else {
          var input_shape_i = ${G("uniforms.input_shape","i",t.length)};
          var output_shape_i = ${G("uniforms.output_shape","i",r.length)};
          original_indices[i] = getOriginalCoordinateFromResizedCoordinate(output_index, scale, output_shape_i,
                                                                           input_shape_i, roi_low, roi_hi);
        }
      }
      return original_indices;
    }`,Qu=(e,t,r,i,a,s,n)=>`
    fn calculateInputIndicesFromOutputIndices(output_indices: ${t.type.indices}) -> ${e.type.indices} {
      var input_indices: ${e.type.indices};
      for (var i:u32 = 0; i < ${i.length}; i++) {
        var output_index = ${t.indicesGet("output_indices","i")};
        var input_index: u32;
        var scale = ${G("uniforms.scales","i",a)};
        if (scale == 1.0) {
          input_index = output_index;
        } else {
          var roi_low = ${G("uniforms.roi","i",s)};
          var roi_hi = ${G("uniforms.roi",`i + ${r.length}`,s)};
          var input_shape_i = ${G("uniforms.input_shape","i",r.length)};
          var output_shape_i = ${G("uniforms.output_shape","i",i.length)};
          var original_idx = getOriginalCoordinateFromResizedCoordinate(output_index, scale, output_shape_i,
                                                                        input_shape_i, roi_low, roi_hi);
          if (!${n} || (original_idx >= 0 && original_idx < ${t.type.value}(input_shape_i))) {
            if (original_idx < 0) {
              input_index = 0;
            } else if (original_idx > ${t.type.value}(input_shape_i - 1)) {
              input_index = input_shape_i - 1;
            } else {
              input_index = u32(getNearestPixelFromOriginal(original_idx, scale < 1));
            }
          } else {
            input_index = u32(original_idx);
          }
        }
        ${e.indicesSet("input_indices","i"," input_index")}
      }
      return input_indices;
    }`,Xu=(e,t)=>`
    fn checkInputIndices(input_indices: ${e.type.indices}) -> bool {
      for (var i:u32 = 0; i < ${t.length}; i++) {
        var input_index = ${e.indicesGet("input_indices","i")};
        if (input_index < 0 || input_index >= ${G("uniforms.input_shape","i",t.length)}) {
          return false;
        }
      }
      return true;
    }`,Fi=(e,t,r,i)=>e.rank>i?`
    ${e.indicesSet("input_indices",t,"channel")};
    ${e.indicesSet("input_indices",r,"batch")};
`:"",Ju=(e,t,r,i,a)=>{let[s,n,l,d]=r.length===2?[-1,0,1,-1]:[0,2,3,1],p=e.type.value;return`
    fn getInputValue(batch: u32, channel: u32, row: u32, col: u32) -> ${p} {
      var input_indices: ${e.type.indices};
      ${e.indicesSet("input_indices",n,`max(0, min(row, ${r[n]} - 1))`)};
      ${e.indicesSet("input_indices",l,`max(0, min(col, ${r[l]} - 1))`)};
      ${Fi(e,d,s,2)}
      return ${e.getByIndices("input_indices")};
    }

    fn bilinearInterpolation(output_indices: ${t.type.indices}) -> ${p} {
      var originalIndices = calculateOriginalIndicesFromOutputIndices(output_indices);
      var row:${p} = originalIndices[${n}];
      var col:${p} = originalIndices[${l}];
      ${i?`if (row < 0 || row > (${r[n]} - 1) || col < 0 || col > (${r[l]} - 1)) {
        return ${a};
      }`:""};
      row = max(0, min(row, ${r[n]} - 1));
      col = max(0, min(col, ${r[l]} - 1));
      var row1: u32 = u32(row);
      var col1: u32 = u32(col);
      var row2: u32 = u32(row + 1);
      var col2: u32 = u32(col + 1);
      var channel: u32 = ${r.length>2?`u32(originalIndices[${d}])`:"0"};
      var batch: u32 =  ${r.length>2?`u32(originalIndices[${s}])`:"0"};
      var x11: ${p} = getInputValue(batch, channel, row1, col1);
      var x12: ${p} = getInputValue(batch, channel, row1, col2);
      var x21: ${p} = getInputValue(batch, channel, row2, col1);
      var x22: ${p} = getInputValue(batch, channel, row2, col2);
      var dx1: ${p} = abs(row - ${p}(row1));
      var dx2: ${p} = abs(${p}(row2) - row);
      var dy1: ${p} = abs(col - ${p}(col1));
      var dy2: ${p} = abs(${p}(col2) - col);
      if (row1 == row2) {
        dx1 = 0.5;
        dx2 = 0.5;
      }
      if (col1 == col2) {
        dy1 = 0.5;
        dy2 = 0.5;
      }
      return (x11 * dx2 * dy2 + x12 * dx2 * dy1 + x21 * dx1 * dy2 + x22 * dx1 * dy1);
    }`},el=(e,t,r,i,a,s,n,l,d,p)=>{let f=r.length===2,[c,u]=f?[0,1]:[2,3],y=e.type.value,w=$=>{let b=$===c?"row":"col";return`
      fn ${b}CubicInterpolation(input_indices: ${e.type.indices}, output_indices: ${t.type.indices}) -> ${y} {
        var output_index = ${t.indicesGet("output_indices",$)};
        var originalIdx: ${y} = getOriginalCoordinateFromResizedCoordinate(output_index, ${a[$]},
        ${i[$]}, ${r[$]}, ${s[$]}, ${s[$]} + ${r.length});
        var fractOriginalIdx: ${y} = originalIdx - floor(originalIdx);
        var coefs = getCubicInterpolationCoefs(fractOriginalIdx);

        if (${l} && (originalIdx < 0 || originalIdx > (${r[$]} - 1))) {
          return ${d};
        }
        var data: array<${y}, 4> = array<${y}, 4>(0.0, 0.0, 0.0, 0.0);
        for (var i: i32 = -1; i < 3; i++) {
          var ${b}: ${y} = originalIdx + ${y}(i);
          if (${b} < 0 || ${b} >= ${r[$]}) {
            ${p?`coefs[i + 1] = 0.0;
                        continue;`:l?`return ${d};`:`${b} = max(0, min(${b}, ${r[$]} - 1));`};
          }
        var input_indices_copy: ${e.type.indices} = input_indices;
          ${e.indicesSet("input_indices_copy",$,`u32(${b})`)};
          data[i + 1] = ${$===c?e.getByIndices("input_indices_copy"):"rowCubicInterpolation(input_indices_copy, output_indices)"};
        }
        return cubicInterpolation1D(data, coefs);
      }`};return`
    ${w(c)};
    ${w(u)};
  fn getCubicInterpolationCoefs(s: ${y}) -> array<${y}, 4> {
    var absS = abs(s);
    var coeffs: array<${y}, 4> = array<${y}, 4>(0.0, 0.0, 0.0, 0.0);
    var oneMinusAbsS: ${y} = 1.0 - absS;
    var twoMinusAbsS: ${y} = 2.0 - absS;
    var onePlusAbsS: ${y} = 1.0 + absS;
    coeffs[0] = ((${n} * onePlusAbsS - 5 * ${n}) * onePlusAbsS + 8 * ${n}) * onePlusAbsS - 4 * ${n};
    coeffs[1] = ((${n} + 2) * absS - (${n} + 3)) * absS * absS + 1;
    coeffs[2] = ((${n} + 2) * oneMinusAbsS - (${n} + 3)) * oneMinusAbsS * oneMinusAbsS + 1;
    coeffs[3] = ((${n} * twoMinusAbsS - 5 * ${n}) * twoMinusAbsS + 8 * ${n}) * twoMinusAbsS - 4 * ${n};
    return coeffs;
  }

  fn cubicInterpolation1D(x: array<${y}, 4>, coefs: array<${y}, 4>) -> ${y} {
    var coefsSum: ${y} = coefs[0] + coefs[1] + coefs[2] + coefs[3];
    return (x[0] * coefs[0] + x[1] * coefs[1]+ x[2] * coefs[2]+ x[3] * coefs[3]) / coefsSum;
  }

  fn bicubicInterpolation(output_indices: ${t.type.indices}) -> ${y} {
    var input_indices: ${e.type.indices} = output_indices;
    return colCubicInterpolation(input_indices, output_indices);
  }
    `},tl=(e,t,r,i,a)=>{let[s,n,l,d,p]=r.length===3?[-1,0,1,2,-1]:[0,2,3,4,1],f=e.type.value;return`
    fn getInputValue(batch: u32, channel: u32, depth:u32, height: u32, width: u32) -> ${f} {
      var input_indices: ${e.type.indices};
      ${e.indicesSet("input_indices",n,`max(0, min(depth, ${r[n]} - 1))`)};
      ${e.indicesSet("input_indices",l,`max(0, min(height, ${r[l]} - 1))`)};
      ${e.indicesSet("input_indices",d,`max(0, min(width, ${r[d]} - 1))`)};
      ${Fi(e,p,s,3)}
      return ${e.getByIndices("input_indices")};
    }

    fn trilinearInterpolation(output_indices: ${t.type.indices}) -> ${f} {
      var originalIndices = calculateOriginalIndicesFromOutputIndices(output_indices);
      var depth:${f} = originalIndices[${n}];
      var height:${f} = originalIndices[${l}];
      var width:${f} = originalIndices[${d}];
      ${i?`if (depth < 0 || depth > (${r[n]} - 1) || height < 0 || height > (${r[l]} - 1) || width < 0 || (width > ${r[d]} - 1)) {
      return ${a};
        }`:""};

    depth = max(0, min(depth, ${r[n]} - 1));
      height = max(0, min(height, ${r[l]} - 1));
      width = max(0, min(width, ${r[d]} - 1));
      var depth1: u32 = u32(depth);
      var height1: u32 = u32(height);
      var width1: u32 = u32(width);
      var depth2: u32 = u32(depth + 1);
      var height2: u32 = u32(height + 1);
      var width2: u32 = u32(width + 1);
      var channel: u32 = ${r.length>3?`u32(originalIndices[${p}])`:"0"};
      var batch: u32 =  ${r.length>3?`u32(originalIndices[${s}])`:"0"};

      var x111: ${f} = getInputValue(batch, channel, depth1, height1, width1);
      var x112: ${f} = getInputValue(batch, channel, depth1, height1, width2);
      var x121: ${f} = getInputValue(batch, channel, depth1, height2, width1);
      var x122: ${f} = getInputValue(batch, channel, depth1, height2, width2);
      var x211: ${f} = getInputValue(batch, channel, depth2, height1, width1);
      var x212: ${f} = getInputValue(batch, channel, depth2, height1, width2);
      var x221: ${f} = getInputValue(batch, channel, depth2, height2, width1);
      var x222: ${f} = getInputValue(batch, channel, depth2, height2, width2);
      var dx1: ${f} = abs(depth - ${f}(depth1));
      var dx2: ${f} = abs(${f}(depth2) - depth);
      var dy1: ${f} = abs(height - ${f}(height1));
      var dy2: ${f} = abs(${f}(height2) - height);
      var dz1: ${f} = abs(width - ${f}(width1));
      var dz2: ${f} = abs(${f}(width2) - width);
      if (depth1 == depth2) {
        dx1 = 0.5;
        dx2 = 0.5;
      }
      if (height1 == height2) {
        dy1 = 0.5;
        dy2 = 0.5;
      }
      if (width1 == width2) {
        dz1 = 0.5;
        dz2 = 0.5;
      }
      return (x111 * dx2 * dy2 * dz2 + x112 * dx2 * dy2 * dz1 + x121 * dx2 * dy1 *dz2 + x122 * dx2 * dy1 * dz1 +
              x211 * dx1 * dy2 * dz2 + x212 * dx1 * dy2 * dz1 + x221 * dx1 * dy1 *dz2 + x222 * dx1 * dy1 * dz1);
    }`},rl=(e,t,r,i,a,s)=>{let n=e.dims,l=Hu(s,t.axes,n.length),d=Ku(n,i,a,t.axes),p=i.slice();i.length===0&&(p=n.map((v,k)=>v===0?1:d[k]/v),t.keepAspectRatioPolicy!=="stretch"&&(d=Yu(n,p,t)));let f=F("output",e.dataType,d.length),c=B("input",e.dataType,n.length),u=O.size(d),y=n.length===d.length&&n.every((v,k)=>v===d[k]),w=t.coordinateTransformMode==="tf_crop_and_resize",$=t.extrapolationValue,b=c.type.value,x=v=>`
      ${y?"":`
      ${Gu(t.coordinateTransformMode,b)};
      ${(()=>{switch(t.mode){case"nearest":return`
              ${Xu(c,n)};
              ${Fu(t.nearestMode,r,b)};
              ${Qu(c,f,n,d,p.length,l.length,w)};
              `;case"linear":return`
              ${Zu(f,n,d,p.length,l.length)};
              ${(()=>{if(n.length===2||n.length===4)return`${Ju(c,f,n,w,$)}`;if(n.length===3||n.length===5)return`${tl(c,f,n,w,$)}`;throw Error("Linear mode only supports input dims 2, 3, 4 and 5 are supported in linear mode.")})()};
            `;case"cubic":return`
            ${(()=>{if(n.length===2||n.length===4)return`${el(c,f,n,d,p,l,t.cubicCoeffA,w,t.extrapolationValue,t.excludeOutside)}`;throw Error("Cubic mode only supports input dims 2 and 4 are supported in linear mode.")})()};
            `;default:throw Error("Invalid resize mode")}})()};
      `}
      ${v.registerUniform("output_size","u32").registerUniform("scales","f32",p.length).registerUniform("roi","f32",l.length).declareVariables(c,f)}
      ${v.mainStart()}
        ${v.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
        ${y?"output[global_idx] = input[global_idx];":`
        let output_indices = ${f.offsetToIndices("global_idx")};
        var input_indices: ${c.type.indices};
        ${(()=>{switch(t.mode){case"nearest":return`input_indices = calculateInputIndicesFromOutputIndices(output_indices);
                if (checkInputIndices(input_indices)) {
                  output[global_idx] = ${c.getByIndices("input_indices")};
                } else {
                  output[global_idx] = ${t.extrapolationValue};
                }`;case"linear":return`output[global_idx] = ${n.length===2||n.length===4?"bilinearInterpolation":"trilinearInterpolation"}(output_indices);`;case"cubic":return"output[global_idx] = bicubicInterpolation(output_indices);";default:throw Error(`Unsupported resize mode: ${t.mode}`)}})()};
`}
      }`;return{name:"Resize",shaderCache:{hint:`${t.cacheKey}|${r}|${p.length>0?p:""}|${a.length>0?a:""}|${l.length>0?l:""}|${y}|${n}`,inputDependencies:["rank"]},getShaderSource:x,getRunData:()=>({outputs:[{dims:d,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(u/64)},programUniforms:[{type:12,data:u},{type:1,data:p},{type:1,data:l},...L(n,d)]})}},il=e=>{let t=e.customDataBuffer;return new Uint32Array(t,t.byteOffset,1)[0]},Ih=(e,t)=>{let r=[],i=[],a=[],s=il(e);if(t.antialias!==0)throw Error("Only default value (0) for Antialias attribute is supported");ju(e.inputs,t,s,r,i,a),e.compute(rl(e.inputs[0],t,s,r,i,a),{inputs:[0]})},zh=e=>{let t=e.antialias,r=e.axes,i=e.coordinateTransformMode,a=e.cubicCoeffA,s=e.excludeOutside!==0,n=e.extrapolationValue,l=e.keepAspectRatioPolicy,d=e.mode,p=e.nearestMode===""?"simple":e.nearestMode;return fe({antialias:t,axes:r,coordinateTransformMode:i,cubicCoeffA:a,excludeOutside:s,extrapolationValue:n,keepAspectRatioPolicy:l,mode:d,nearestMode:p})}}),al,nl,Ah,Cm=D(()=>{X(),te(),be(),re(),al=(e,t)=>{let[r,i,a,s]=e,{numHeads:n,rotaryEmbeddingDim:l}=t;if(r.dims.length!==3&&r.dims.length!==4)throw new Error(`Input 'x' is expected to have 3 or 4 dimensions, got ${r.dims.length}`);if(!O.areEqual(i.dims,[])&&!O.areEqual(i.dims,[1])&&i.dims.length!==2)throw new Error(`Input 'position_ids' is expected to have 0, 1, or 2 dimensions, got ${i.dims.length}`);if(a.dims.length!==2)throw new Error(`Input 'cos_cache' is expected to have 2 dimensions, got ${a.dims.length}`);if(s.dims.length!==2)throw new Error(`Input 'sin_cache' is expected to have 2 dimensions, got ${s.dims.length}`);if(!O.areEqual(a.dims,s.dims))throw new Error("Inputs 'cos_cache' and 'sin_cache' are expected to have the same shape");if(l>0&&n===0)throw new Error("num_heads must be provided if rotary_embedding_dim is specified");let d=r.dims[0],p=r.dims[r.dims.length-2],f=a.dims[0],c=O.sizeFromDimension(r.dims,1)/p,u=l===0?a.dims[1]*2:c/n;if(l>u)throw new Error("rotary_embedding_dim must be less than or equal to head_size");if(i.dims.length===2){if(d!==i.dims[0])throw new Error(`Input 'position_ids' dimension 0 should be of size batch_size, got ${i.dims[0]}`);if(p!==i.dims[1])throw new Error(`Input 'position_ids' dimension 1 should be of size sequence_length, got ${i.dims[1]}`)}if(u/2!==a.dims[1]&&l/2!==a.dims[1])throw new Error(`Input 'cos_cache' dimension 1 should be same as head_size / 2 or rotary_embedding_dim / 2, got ${a.dims[1]}`);if(p>f)throw new Error("Updating cos_cache and sin_cache in RotaryEmbedding is not currently supported")},nl=(e,t)=>{let{interleaved:r,numHeads:i,rotaryEmbeddingDim:a,scale:s}=t,n=e[0].dims[0],l=O.sizeFromDimension(e[0].dims,1),d=e[0].dims[e[0].dims.length-2],p=l/d,f=e[2].dims[1],c=a===0?f*2:p/i,u=new Array(n,d,p/c,c-f),y=O.computeStrides(u),w=[{type:1,data:s},{type:12,data:u},{type:12,data:y},...e[0].dims.length===3?new Array({type:12,data:[l,p,c,1]}):[],...e[0].dims.length===4?new Array({type:12,data:[l,c,d*c,1]}):[],...L(e[0].dims,e[1].dims,e[2].dims,e[3].dims,e[0].dims)],$=b=>{let x=B("input",e[0].dataType,e[0].dims.length),v=B("position_ids",e[1].dataType,e[1].dims.length),k=B("cos_cache",e[2].dataType,e[2].dims.length),S=B("sin_cache",e[3].dataType,e[3].dims.length),E=F("output",e[0].dataType,e[0].dims.length);return b.registerUniforms([{name:"scale",type:"f32"},{name:"global_shape",type:"u32",length:u.length},{name:"global_strides",type:"u32",length:y.length},{name:"input_output_strides",type:"u32",length:y.length}]),`
        ${b.declareVariables(x,v,k,S,E)}

        ${b.mainStart(Dt)}
          let half_rotary_emb_dim = uniforms.${k.name}_shape[1];
          let bsnh = global_idx / uniforms.global_strides % uniforms.global_shape;
          let size = uniforms.global_shape[0] * uniforms.global_strides[0];
          ${b.guardAgainstOutOfBoundsWorkgroupSizes("size")}

          if (bsnh[3] < half_rotary_emb_dim) {
            let position_ids_idx =
                ${v.broadcastedIndicesToOffset("bsnh.xy",F("",v.type.tensor,2))};
            let position_id =
                u32(${v.getByOffset("position_ids_idx")}) + select(0, bsnh[1], position_ids_idx == 0);
            let i = dot(bsnh, uniforms.input_output_strides) + select(0, bsnh[3], ${r});
            let j = i + select(half_rotary_emb_dim, 1, ${r});
            let re = ${x.getByOffset("i")} * ${k.get("position_id","bsnh[3]")} -
                ${x.getByOffset("j")} * ${S.get("position_id","bsnh[3]")};
            ${E.setByOffset("i","re")}
            let im = ${x.getByOffset("i")} * ${S.get("position_id","bsnh[3]")} +
                ${x.getByOffset("j")} * ${k.get("position_id","bsnh[3]")};
            ${E.setByOffset("j","im")}
          } else {
            let k = dot(bsnh, uniforms.input_output_strides) + half_rotary_emb_dim;
            ${E.setByOffset("k",x.getByOffset("k"))}
          }
        }`};return{name:"RotaryEmbedding",shaderCache:{hint:fe({interleaved:r}).cacheKey,inputDependencies:["rank","rank","rank","rank"]},getShaderSource:$,getRunData:()=>({outputs:[{dims:e[0].dims,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(O.size(u)/Dt)},programUniforms:w})}},Ah=(e,t)=>{al(e.inputs,t),e.compute(nl(e.inputs,t))}}),sl,ol,Oh,Tm=D(()=>{X(),te(),re(),sl=e=>{if(!e||e.length<3)throw new Error("layerNorm requires at least 3 inputs.");let t=e[0],r=e[1],i=e[2];if(t.dataType!==r.dataType||t.dataType!==i.dataType)throw new Error("All inputs must have the same data type");if(t.dims.length!==3&&t.dims.length!==2)throw new Error("Input must be 2D or 3D");if(r.dims.length!==3&&r.dims.length!==2)throw new Error("Skip must be 2D or 3D");let a=t.dims[t.dims.length-1],s=t.dims[t.dims.length-2];if(r.dims[r.dims.length-1]!==a)throw new Error("Skip must have the same hidden size as input");if(r.dims[r.dims.length-2]!==s)throw new Error("Skip must have the same sequence length as input");if(i.dims.length!==1)throw new Error("Gamma must be 1D");if(i.dims[i.dims.length-1]!==a)throw new Error("Gamma must have the same hidden size as input");if(e.length>3){let n=e[3];if(n.dims.length!==1)throw new Error("Beta must be 1D");if(n.dims[n.dims.length-1]!==a)throw new Error("Beta must have the same hidden size as input")}if(e.length>4){let n=e[4];if(n.dims.length!==1)throw new Error("Bias must be 1D");if(n.dims[n.dims.length-1]!==a)throw new Error("Bias must have the same hidden size as input")}},ol=(e,t,r,i)=>{let a=t.simplified,s=e[0].dims,n=O.size(s),l=s,d=n,p=s.slice(-1)[0],f=i?s.slice(0,-1).concat(1):[],c=!a&&e.length>3,u=e.length>4,y=i&&r>1,w=i&&r>2,$=r>3,b=64,x=_e(p),v=[{type:12,data:d},{type:12,data:x},{type:12,data:p},{type:1,data:t.epsilon}],k=E=>{let z=[{name:"output_size",type:"u32"},{name:"components",type:"u32"},{name:"hidden_size",type:"u32"},{name:"epsilon",type:"f32"}],T=[B("x",e[0].dataType,e[0].dims,x),B("skip",e[1].dataType,e[1].dims,x),B("gamma",e[2].dataType,e[2].dims,x)];c&&T.push(B("beta",e[3].dataType,e[3].dims,x)),u&&T.push(B("bias",e[4].dataType,e[4].dims,x)),T.push(F("output",e[0].dataType,l,x)),y&&T.push(F("mean_output",1,f)),w&&T.push(F("inv_std_output",1,f)),$&&T.push(F("input_skip_bias_sum",e[0].dataType,l,x));let M=Se(e[0].dataType),W=Se(1,x);return`

      ${E.registerUniforms(z).declareVariables(...T)}
      var<workgroup> sum_shared : array<${W}, ${b}>;
      var<workgroup> sum_squared_shared : array<${W}, ${b}>;

      ${E.mainStart([b,1,1])}
        let ix = local_id.x;
        let iy = global_id.x / ${b};

        let hidden_size_vectorized: u32 = uniforms.hidden_size / uniforms.components;
        var stride = hidden_size_vectorized / ${b};
        let offset = ix * stride + iy * hidden_size_vectorized;
        let offset1d = stride * ix;
        if (ix == ${b-1}) {
          stride = hidden_size_vectorized - stride * ix;
        }
        for (var i: u32 = 0; i < stride; i++) {
          let skip_value = skip[offset + i];
          let bias_value = ${u?"bias[offset1d + i]":M+"(0.0)"};
          let input_value = x[offset + i];
          let value = input_value + skip_value + bias_value;
          ${$?"input_skip_bias_sum[offset + i] = value;":""}
          output[offset + i] = value;
          let f32_value = ${Mt(M,x,"value")};
          sum_shared[ix] += f32_value;
          sum_squared_shared[ix] += f32_value * f32_value;
        }
        workgroupBarrier();

        var reduce_size : u32 = ${b};
        for (var curr_size = reduce_size >> 1;  curr_size > 0; curr_size = reduce_size >> 1) {
          reduce_size = curr_size + (reduce_size & 1);
          if (ix < curr_size) {
            sum_shared[ix] += sum_shared[ix + reduce_size];
            sum_squared_shared[ix] += sum_squared_shared[ix + reduce_size];
          }
          workgroupBarrier();
        }

        let sum = sum_shared[0];
        let square_sum = sum_squared_shared[0];
        let mean = ${ht("sum",x)} / f32(uniforms.hidden_size);
        let inv_std_dev = inverseSqrt(${ht("square_sum",x)} / f32(uniforms.hidden_size) ${a?"":"- mean * mean"} + uniforms.epsilon);
        ${y?"mean_output[global_idx] = mean;":""}
        ${w?"inv_std_output[global_idx] = inv_std_dev;":""}

        for (var i: u32 = 0; i < stride; i++) {
          output[offset + i] = (output[offset + i] ${a?"":`- ${M}(mean)`}) *
            ${M}(inv_std_dev) * gamma[offset1d + i]
            ${c?"+ beta[offset1d + i]":""};
        }
      }`},S=[{dims:l,dataType:e[0].dataType}];return r>1&&S.push({dims:f,dataType:1}),r>2&&S.push({dims:f,dataType:1}),r>3&&S.push({dims:s,dataType:e[0].dataType}),{name:"SkipLayerNormalization",shaderCache:{hint:`${x};${y};${w};${$}`,inputDependencies:e.map((E,z)=>"type")},getShaderSource:k,getRunData:()=>({outputs:S,dispatchGroup:{x:Math.ceil(d/p)},programUniforms:v})}},Oh=(e,t)=>{sl(e.inputs);let r=[0];e.outputCount>1&&r.push(-3),e.outputCount>2&&r.push(-3),e.outputCount>3&&r.push(3),e.compute(ol(e.inputs,t,e.outputCount,!1),{outputs:r})}}),ul,jt,ll,Hi,dl,pl,Rh,Bh,Im=D(()=>{X(),te(),be(),re(),ul=(e,t)=>{if(!e||e.length<1)throw new Error("too few inputs");if(t.axes.length!==0){if(t.axes.length!==t.starts.length||t.axes.length!==t.ends.length)throw new Error("axes, starts and ends must have the same length")}else if(t.starts.length!==t.ends.length)throw new Error("starts and ends must have the same length");e.slice(1).forEach((r,i)=>{if(e[i+1].dataType!==6&&e[i+1].dataType!==7)throw new Error(`Input ${i} must be an array of int32 or int64`)})},jt=(e,t)=>{let r=[];if(e.length>t)if(e[t].dataType===7)e[t].getBigInt64Array().forEach(i=>r.push(Number(i)));else if(e[t].dataType===6)e[t].getInt32Array().forEach(i=>r.push(Number(i)));else throw new Error(`Input ${t} must be an array of int32 or int64`);return r},ll=(e,t)=>{if(e.length>1){let r=jt(e,1),i=jt(e,2),a=jt(e,3);return a.length===0&&(a=[...Array(e[0].dims.length).keys()]),fe({starts:r,ends:i,axes:a})}else return t},Hi=(e,t,r,i,a)=>{let s=e;return e<0&&(s+=r[i[t]]),a[t]<0?Math.max(0,Math.min(s,r[i[t]]-1)):Math.max(0,Math.min(s,r[i[t]]))},dl=(e,t,r)=>`fn calculateInputIndices(output_indices: ${t.type.indices}) -> ${e.type.indices} {
          var input_indices: ${e.type.indices};
          var carry = 0u;
          for (var i = ${r.length}; i >= 0; i--) {
            let input_shape_i = ${G("uniforms.input_shape","i",r.length)};
            let steps_i = ${G("uniforms.steps","i",r.length)};
            let signs_i = ${G("uniforms.signs","i",r.length)};
            let starts_i = ${G("uniforms.starts","i",r.length)};
            var output_index = ${t.indicesGet("output_indices","i")};
            var input_index = output_index * steps_i + starts_i + carry;
            carry = input_index / input_shape_i;
            input_index = input_index % input_shape_i;
            if (signs_i < 0) {
              input_index = input_shape_i - input_index - 1u + starts_i;
            }
            ${e.indicesSet("input_indices","i","input_index")};
          }
          return input_indices;
      }`,pl=(e,t)=>{let r=e[0].dims,i=O.size(r),a=t.axes.length>0?O.normalizeAxes(t.axes,r.length):[...Array(r.length).keys()],s=jt(e,4);s.forEach(x=>x!==0||(()=>{throw new Error("step cannot be 0")})),s.length===0&&(s=Array(a.length).fill(1));let n=t.starts.map((x,v)=>Hi(x,v,r,a,s)),l=t.ends.map((x,v)=>Hi(x,v,r,a,s));if(a.length!==n.length||a.length!==l.length)throw new Error("start, ends and axes should have the same number of elements");if(a.length!==r.length)for(let x=0;x<r.length;++x)a.includes(x)||(n.splice(x,0,0),l.splice(x,0,r[x]),s.splice(x,0,1));let d=s.map(x=>Math.sign(x));s.forEach((x,v,k)=>{if(x<0){let S=(l[v]-n[v])/x,E=n[v],z=E+S*s[v];n[v]=z,l[v]=E,k[v]=-x}});let p=r.slice(0);a.forEach((x,v)=>{p[x]=Math.ceil((l[x]-n[x])/s[x])});let f={dims:p,dataType:e[0].dataType},c=F("output",e[0].dataType,p.length),u=B("input",e[0].dataType,e[0].dims.length),y=O.size(p),w=[{name:"outputSize",type:"u32"},{name:"starts",type:"u32",length:n.length},{name:"signs",type:"i32",length:d.length},{name:"steps",type:"u32",length:s.length}],$=[{type:12,data:y},{type:12,data:n},{type:6,data:d},{type:12,data:s},...L(e[0].dims,p)],b=x=>`
      ${x.registerUniforms(w).declareVariables(u,c)}
        ${dl(u,c,r)}
        ${x.mainStart()}
          ${x.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
          let output_indices = ${c.offsetToIndices("global_idx")};
          let input_indices = calculateInputIndices(output_indices);
          ${c.setByOffset("global_idx",u.getByIndices("input_indices"))}
      }`;return{name:"Slice",shaderCache:{hint:`${d.length}_${n.length}_${s.length}`,inputDependencies:["rank"]},getShaderSource:b,getRunData:()=>({outputs:[f],dispatchGroup:{x:Math.ceil(i/64)},programUniforms:$})}},Rh=(e,t)=>{ul(e.inputs,t);let r=ll(e.inputs,t);e.compute(pl(e.inputs,r),{inputs:[0]})},Bh=e=>{let t=e.starts,r=e.ends,i=e.axes;return fe({starts:t,ends:r,axes:i})}}),hl,cl,Mh,Ph,zm=D(()=>{X(),te(),be(),gt(),re(),hl=e=>{if(!e||e.length!==1)throw new Error("Softmax op requires 1 input.")},cl=(e,t)=>{let r=e.inputs[0],i=r.dims,a=O.size(i),s=64,n=i.length,l=O.normalizeAxis(t.axis,n),d=l<i.length-1,p,f=[];d?(f=Array.from({length:n},(T,M)=>M),f[l]=n-1,f[n-1]=l,p=e.compute(De(r,f),{inputs:[r],outputs:[-1]})[0]):p=r;let c=p.dims,u=c[n-1],y=a/u,w=_e(u),$=u/w,b=(T,M)=>M===4?`max(max(${T}.x, ${T}.y), max(${T}.z, ${T}.w))`:M===2?`max(${T}.x, ${T}.y)`:M===3?`max(max(${T}.x, ${T}.y), ${T}.z)`:T,x=B("x",p.dataType,p.dims,w),v=F("result",p.dataType,p.dims,w),k=x.type.value,S=Se(p.dataType)==="f32"?`var threadMax = ${k}(-3.402823e+38f);`:`var threadMax = ${k}(-65504.0h);`,E=T=>`
      var<workgroup> rowMaxShared : ${k};
      var<workgroup> rowSumShared : ${k};
      var<workgroup> threadShared : array<${k}, ${s}>;

      fn getValue(row: i32, col: i32, row_stride: i32) -> ${k} {
        let index = row * row_stride + col;
        return x[index];
      }

      fn setValue(row: i32, col: i32, row_stride: i32, value: ${k}) {
        let index = row * row_stride + col;
        result[index] = value;
      }
      ${T.registerUniform("packedCols","i32").declareVariables(x,v)}
      ${T.mainStart()}
        let gindex = i32(global_idx);
        let lindex = i32(local_idx);
        const wg = ${s};
        let row = gindex / wg;
        let cols = uniforms.packedCols;
        let row_stride : i32 = uniforms.packedCols;

        // find the rows max
        ${S}
        for (var col = lindex; col < cols; col += wg) {
          let value = getValue(row, col, row_stride);
          threadMax = max(threadMax, value);
        }
        if (lindex < cols) {
          threadShared[lindex] = threadMax;
        }
        workgroupBarrier();

        var reduceSize = min(cols, wg);
        for (var currSize = reduceSize >> 1;  currSize > 0; currSize = reduceSize >> 1) {
          reduceSize = currSize + (reduceSize & 1);
          if (lindex < currSize) {
            threadShared[lindex] = max(threadShared[lindex], threadShared[lindex + reduceSize]);
          }
          workgroupBarrier();
        }
        if (lindex == 0) {
          rowMaxShared = ${k}(${b("threadShared[0]",w)});
        }
        workgroupBarrier();

        // find the rows sum
        var threadSum = ${k}(0.0);
        for (var col = lindex; col < cols; col += wg) {
          let subExp = exp(getValue(row, col, row_stride) - rowMaxShared);
          threadSum += subExp;
        }
        threadShared[lindex] = threadSum;
        workgroupBarrier();

        for (var currSize = wg >> 1;  currSize > 0; currSize = currSize >> 1) {
          if (lindex < currSize) {
            threadShared[lindex] = threadShared[lindex] + threadShared[lindex + currSize];
          }
          workgroupBarrier();
        }
        if (lindex == 0) {
          rowSumShared = ${k}(${ht("threadShared[0]",w)});
        }
        workgroupBarrier();

        // calculate final value for each element in the row
        for (var col = lindex; col < cols; col += wg) {
          let value = exp(getValue(row, col, row_stride) - rowMaxShared) / rowSumShared;
          setValue(row, col, row_stride, value);
        }
      }`,z=e.compute({name:"Softmax",shaderCache:{hint:`${w}`,inputDependencies:["type"]},getRunData:()=>({outputs:[{dims:c,dataType:p.dataType}],dispatchGroup:{x:y},programUniforms:[{type:6,data:$}]}),getShaderSource:E},{inputs:[p],outputs:[d?-1:0]})[0];d&&e.compute(De(z,f),{inputs:[z]})},Mh=(e,t)=>{hl(e.inputs),cl(e,t)},Ph=e=>fe({axis:e.axis})}),fl,ml,gl,yl,wl,Dh,Uh,Am=D(()=>{X(),te(),be(),re(),fl=e=>{if(!e||e.length<1)throw new Error("too few inputs")},ml=(e,t)=>{let r=[],i=t.numOutputs;return e[1].dims[0]>0&&(e[1].getBigInt64Array().forEach(a=>r.push(Number(a))),i=r.length),fe({numOutputs:i,axis:t.axis,splitSizes:r})},gl=e=>`
fn calculateOutputIndex(index: u32) -> u32 {
    for (var i: u32 = 0u; i < ${e}u; i += 1u ) {
    if (index < ${G("uniforms.size_in_split_axis","i",e)}) {
        return i;
    }
    }
    return ${e}u;
}`,yl=e=>{let t=e.length,r=[];for(let i=0;i<t;++i){let a=e[i].setByIndices("indices","input[global_idx]");t===1?r.push(a):i===0?r.push(`if (output_number == ${i}u) { ${a} }`):i===t-1?r.push(`else { ${a} }`):r.push(`else if (output_number == ${i}) { ${a} }`)}return`
      fn writeBufferData(output_number: u32, indices: ${e[0].type.indices}, global_idx: u32) {
        ${r.join(`
`)}
      }`},wl=(e,t)=>{let r=e[0].dims,i=O.size(r),a=e[0].dataType,s=O.normalizeAxis(t.axis,r.length),n=new Array(t.numOutputs),l=B("input",a,r.length),d=new Array(t.numOutputs),p=[],f=[],c=0,u=[{type:12,data:i}];for(let w=0;w<t.numOutputs;w++){c+=t.splitSizes[w],d[w]=c;let $=r.slice();$[s]=t.splitSizes[w],f.push($),n[w]=F(`output${w}`,a,$.length),p.push({dims:f[w],dataType:e[0].dataType})}u.push({type:12,data:d},...L(r,...f));let y=w=>`
  ${w.registerUniform("input_size","u32").registerUniform("size_in_split_axis","u32",d.length).declareVariables(l,...n)}
  ${gl(d.length)}
  ${yl(n)}

  ${w.mainStart()}
    ${w.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.input_size")}

    var indices = ${l.offsetToIndices("global_idx")};
    var index = ${l.indicesGet("indices",s)};
    let output_number = calculateOutputIndex(index);
    if (output_number != 0) {
      index -= ${G("uniforms.size_in_split_axis","output_number - 1u",d.length)};
      ${l.indicesSet("indices",s,"index")};
    }
    writeBufferData(output_number, indices, global_idx);
  }`;return{name:"Split",shaderCache:{hint:t.cacheKey,inputDependencies:["rank"]},getShaderSource:y,getRunData:()=>({outputs:p,dispatchGroup:{x:Math.ceil(i/64)},programUniforms:u})}},Dh=(e,t)=>{fl(e.inputs);let r=e.inputs.length===1?t:ml(e.inputs,t);e.compute(wl(e.inputs,r),{inputs:[0]})},Uh=e=>{let t=e.axis,r=e.splitSizes,i=e.numOutputs<0?r.length:e.numOutputs;if(i!==r.length)throw new Error("numOutputs and splitSizes lengh must be equal");return fe({axis:t,numOutputs:i,splitSizes:r})}}),$l,_l,Nh,Om=D(()=>{X(),te(),re(),$l=(e,t,r,i,a)=>{let s=F("output_data",a,r.length,4),n=B("a_data",t[1].dataType,t[1].dims.length,4),l=B("b_data",t[2].dataType,t[2].dims.length,4),d=B("c_data",t[0].dataType,t[0].dims.length,4),p,f=(c,u,y)=>`select(${u}, ${c}, ${y})`;if(!i)p=s.setByOffset("global_idx",f(n.getByOffset("global_idx"),l.getByOffset("global_idx"),d.getByOffset("global_idx")));else{let c=(u,y,w="")=>{let $=`a_data[index_a${y}][component_a${y}]`,b=`b_data[index_b${y}][component_b${y}]`,x=`bool(c_data[index_c${y}] & (0xffu << (component_c${y} * 8)))`;return`
            let output_indices${y} = ${s.offsetToIndices(`global_idx * 4u + ${y}u`)};
            let offset_a${y} = ${n.broadcastedIndicesToOffset(`output_indices${y}`,s)};
            let offset_b${y} = ${l.broadcastedIndicesToOffset(`output_indices${y}`,s)};
            let offset_c${y} = ${d.broadcastedIndicesToOffset(`output_indices${y}`,s)};
            let index_a${y} = offset_a${y} / 4u;
            let index_b${y} = offset_b${y} / 4u;
            let index_c${y} = offset_c${y} / 4u;
            let component_a${y} = offset_a${y} % 4u;
            let component_b${y} = offset_b${y} % 4u;
            let component_c${y} = offset_c${y} % 4u;
            ${u}[${y}] = ${w}(${f($,b,x)});
          `};a===9?p=`
            var data = vec4<u32>(0);
            ${c("data",0,"u32")}
            ${c("data",1,"u32")}
            ${c("data",2,"u32")}
            ${c("data",3,"u32")}
            output_data[global_idx] = dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(data));`:p=`
            ${c("output_data[global_idx]",0)}
            ${c("output_data[global_idx]",1)}
            ${c("output_data[global_idx]",2)}
            ${c("output_data[global_idx]",3)}
          `}return`
        ${e.registerUniform("vec_size","u32").declareVariables(d,n,l,s)}
        ${e.mainStart()}
        ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}
        ${p}
      }`},_l=e=>{let t=e[1].dims,r=e[2].dims,i=e[0].dims,a=e[1].dataType,s=!(O.areEqual(t,r)&&O.areEqual(r,i)),n=t,l=O.size(t);if(s){let p=Pt.calcShape(Pt.calcShape(t,r,!1),i,!1);if(!p)throw new Error("Can't perform where op on the given tensors");n=p,l=O.size(n)}let d=Math.ceil(l/4);return{name:"Where",shaderCache:{inputDependencies:["rank","rank","rank"]},getShaderSource:p=>$l(p,e,n,s,a),getRunData:()=>({outputs:[{dims:n,dataType:a}],dispatchGroup:{x:Math.ceil(l/64/4)},programUniforms:[{type:12,data:d},...L(i,t,r,n)]})}},Nh=e=>{e.compute(_l(e.inputs))}}),Wh,Rm=D(()=>{Zf(),Aa(),Qf(),Xf(),Jf(),em(),tm(),nm(),um(),lm(),dm(),pm(),hm(),cm(),fm(),mm(),gm(),ym(),wm(),$m(),_m(),Wp(),vm(),uh(),bm(),xm(),Sm(),km(),za(),Em(),Cm(),Tm(),Im(),zm(),Am(),dh(),gt(),Oa(),Om(),Wh=new Map([["Abs",[Nd]],["Acos",[Wd]],["Acosh",[qd]],["Add",[vp]],["ArgMax",[Md,aa]],["ArgMin",[Bd,aa]],["Asin",[Vd]],["Asinh",[Ld]],["Atan",[jd]],["Atanh",[Gd]],["Attention",[Pd]],["AveragePool",[$h,wh]],["BatchNormalization",[Dd]],["BiasAdd",[Ud]],["BiasSplitGelu",[_p]],["Cast",[Hd,Fd]],["Ceil",[Yd]],["Clip",[Kd]],["Concat",[Ap,Op]],["Conv",[la,ua]],["ConvTranspose",[Lp,Vp]],["Cos",[Zd]],["Cosh",[Qd]],["CumSum",[jp,Gp]],["DepthToSpace",[Fp,Hp]],["DequantizeLinear",[Eh,Ch]],["Div",[bp]],["Einsum",[Kp,Yp]],["Elu",[Xd,Zt]],["Equal",[xp]],["Erf",[Jd]],["Exp",[ep]],["Expand",[Zp]],["FastGelu",[Qp]],["Floor",[tp]],["FusedConv",[la,ua]],["Gather",[Jp,Xp]],["GatherElements",[ih,rh]],["GatherBlockQuantized",[eh,th]],["Gelu",[rp]],["Gemm",[nh,ah]],["GlobalAveragePool",[vh,_h]],["GlobalMaxPool",[kh,Sh]],["Greater",[Cp]],["GreaterOrEqual",[Ip]],["GroupQueryAttention",[hh,ph]],["HardSigmoid",[dp,lp]],["InstanceNormalization",[ch]],["LayerNormalization",[fh]],["LeakyRelu",[ip,Zt]],["Less",[Tp]],["LessOrEqual",[zp]],["Log",[wp]],["MatMul",[Np]],["MatMulNBits",[mh,gh]],["MaxPool",[bh,xh]],["Mul",[Sp]],["MultiHeadAttention",[oh,sh]],["Neg",[np]],["Not",[ap]],["Pad",[yh]],["Pow",[kp]],["QuickGelu",[$p,Zt]],["Range",[Th]],["Reciprocal",[sp]],["ReduceMin",[Id]],["ReduceMean",[Sd]],["ReduceMax",[Td]],["ReduceSum",[Ad]],["ReduceProd",[zd]],["ReduceL1",[kd]],["ReduceL2",[Ed]],["ReduceLogSum",[Rd]],["ReduceLogSumExp",[Cd]],["ReduceSumSquare",[Od]],["Relu",[op]],["Resize",[Ih,zh]],["RotaryEmbedding",[Ah]],["Sigmoid",[up]],["Sin",[pp]],["Sinh",[hp]],["Slice",[Rh,Bh]],["SkipLayerNormalization",[Oh]],["Split",[Dh,Uh]],["Sqrt",[cp]],["Softmax",[Mh,Ph]],["Sub",[Ep]],["Tan",[fp]],["Tanh",[mp]],["ThresholdedRelu",[yp,Zt]],["Tile",[lh]],["Transpose",[hd,cd]],["Where",[Nh]]])}),qh,Bm=D(()=>{Ke(),et(),re(),qh=class{constructor(e){this.backend=e,this.repo=new Map,this.attributesBound=!1}getArtifact(e){return this.repo.get(e)}setArtifact(e,t){this.repo.set(e,t)}run(e,t,r,i,a){Je(e.programInfo.name);let s=this.backend.device,n=this.backend.getComputePassEncoder();this.backend.writeTimestamp(this.backend.pendingDispatchNumber*2);let l=[];for(let p of t)l.push({binding:l.length,resource:{buffer:p.buffer}});for(let p of r)l.push({binding:l.length,resource:{buffer:p.buffer}});a&&l.push({binding:l.length,resource:a});let d=s.createBindGroup({layout:e.computePipeline.getBindGroupLayout(0),entries:l,label:e.programInfo.name});if(this.backend.sessionStatus==="capturing"){let p={kernelId:this.backend.currentKernelId,computePipeline:e.computePipeline,bindGroup:d,dispatchGroup:i};this.backend.capturedCommandList.get(this.backend.currentSessionId).push(p)}n.setPipeline(e.computePipeline),n.setBindGroup(0,d),n.dispatchWorkgroups(...i),this.backend.writeTimestamp(this.backend.pendingDispatchNumber*2+1),this.backend.pendingDispatchNumber++,(this.backend.pendingDispatchNumber>=this.backend.maxDispatchNumber||this.backend.queryType==="at-passes")&&this.backend.endComputePass(),this.backend.pendingDispatchNumber>=this.backend.maxDispatchNumber&&this.backend.flush(),He(e.programInfo.name)}dispose(){}build(e,t){Je(e.name);let r=this.backend.device,i=[];r.features.has("shader-f16")&&i.push("enable f16;");let a=pd(t,this.backend.device.limits),s=e.getShaderSource(a),n=`${i.join(`
`)}
${a.additionalImplementations}
${s}`,l=r.createShaderModule({code:n,label:e.name});ce("verbose",()=>`[WebGPU] ${e.name} shader code: ${n}`);let d=r.createComputePipeline({compute:{module:l,entryPoint:"main"},layout:"auto",label:e.name});return He(e.name),{programInfo:e,computePipeline:d,uniformVariablesInfo:a.variablesInfo}}normalizeDispatchGroupSize(e){let t=typeof e=="number"?e:e.x,r=typeof e=="number"?1:e.y||1,i=typeof e=="number"?1:e.z||1,a=this.backend.device.limits.maxComputeWorkgroupsPerDimension;if(t<=a&&r<=a&&i<=a)return[t,r,i];let s=t*r*i,n=Math.ceil(Math.sqrt(s));if(n>a){if(n=Math.ceil(Math.cbrt(s)),n>a)throw new Error("Total dispatch size exceeds WebGPU maximum.");return[n,n,n]}else return[n,n,1]}}}),vl,bl,xl,Vh,Mm=D(()=>{Ke(),X(),et(),sd(),Kf(),Rm(),Bm(),vl=(e,t)=>{if(t.length!==e.length)throw new Error(`inputDependencies length ${t.length} is not equal to inputTensors length ${e.length}.`);let r=[];for(let i=0;i<e.length;++i){let a=e[i].dataType;switch(t[i]){case"none":{r.push("");break}case"type":{r.push(`${a}`);break}case"rank":{let s=e[i].dims.length;r.push(`${a};${s}`);break}case"dims":{let s=e[i].dims.join(",");r.push(`${a};${s}`);break}default:throw new Error(`unsupported input dependency: ${t[i]}`)}}return r.join("|")},bl=(e,t,r)=>{var a,s;let i=e.name;return(a=e.shaderCache)!=null&&a.hint&&(i+="["+e.shaderCache.hint+"]"),i+=":"+r+`:${vl(t,((s=e.shaderCache)==null?void 0:s.inputDependencies)??new Array(t.length).fill("dims"))}`,i},xl=class{constructor(e){e&&(this.architecture=e.architecture,this.vendor=e.vendor)}isArchitecture(e){return this.architecture===e}isVendor(e){return this.vendor===e}},Vh=class{constructor(){this.currentSessionId=null,this.currentKernelId=null,this.commandEncoder=null,this.computePassEncoder=null,this.maxDispatchNumber=16,this.pendingDispatchNumber=0,this.pendingKernels=[],this.pendingQueries=new Map,this.sessionStatus="default",this.capturedCommandList=new Map,this.capturedPendingKernels=new Map,this.sessionExternalDataMapping=new Map}get currentKernelCustomData(){if(this.currentKernelId===null)throw new Error("currentKernelCustomData(): currentKernelId is null. (should not happen)");let e=this.kernelCustomData.get(this.currentKernelId);return e||(e={},this.kernelCustomData.set(this.currentKernelId,e)),e}async initialize(e,t){this.env=e;let r=[],i={requiredLimits:{maxComputeWorkgroupStorageSize:t.limits.maxComputeWorkgroupStorageSize,maxComputeWorkgroupsPerDimension:t.limits.maxComputeWorkgroupsPerDimension,maxStorageBufferBindingSize:t.limits.maxStorageBufferBindingSize,maxBufferSize:t.limits.maxBufferSize,maxComputeInvocationsPerWorkgroup:t.limits.maxComputeInvocationsPerWorkgroup,maxComputeWorkgroupSizeX:t.limits.maxComputeWorkgroupSizeX,maxComputeWorkgroupSizeY:t.limits.maxComputeWorkgroupSizeY,maxComputeWorkgroupSizeZ:t.limits.maxComputeWorkgroupSizeZ},requiredFeatures:r};t.features.has("chromium-experimental-timestamp-query-inside-passes")?r.push("chromium-experimental-timestamp-query-inside-passes"):t.features.has("timestamp-query")&&r.push("timestamp-query"),t.features.has("shader-f16")&&r.push("shader-f16"),this.device=await t.requestDevice(i),this.adapterInfo=new xl(t.info||await t.requestAdapterInfo()),this.gpuDataManager=od(this),this.programManager=new qh(this),this.kernels=new Map,this.kernelPersistentData=new Map,this.kernelCustomData=new Map,Ea(e.logLevel,!!e.debug),this.device.onuncapturederror=a=>{a.error instanceof GPUValidationError&&console.error(`An uncaught WebGPU validation error was raised: ${a.error.message}`)},Object.defineProperty(this.env.webgpu,"device",{value:this.device,writable:!1,enumerable:!0,configurable:!1}),Object.defineProperty(this.env.webgpu,"adapter",{value:t,writable:!1,enumerable:!0,configurable:!1}),this.setQueryType()}dispose(){typeof this.querySet<"u"&&this.querySet.destroy(),this.gpuDataManager.dispose()}getCommandEncoder(){return this.commandEncoder||(this.commandEncoder=this.device.createCommandEncoder()),this.commandEncoder}getComputePassEncoder(){if(!this.computePassEncoder){let e=this.getCommandEncoder(),t={};this.queryType==="at-passes"&&(t.timestampWrites={querySet:this.querySet,beginningOfPassWriteIndex:this.pendingDispatchNumber*2,endOfPassWriteIndex:this.pendingDispatchNumber*2+1}),this.computePassEncoder=e.beginComputePass(t)}return this.computePassEncoder}endComputePass(){this.computePassEncoder&&(this.computePassEncoder.end(),this.computePassEncoder=null)}flush(){if(!this.commandEncoder)return;Je(),this.endComputePass();let e;this.queryType!=="none"&&(this.commandEncoder.resolveQuerySet(this.querySet,0,this.pendingDispatchNumber*2,this.queryResolveBuffer,0),e=this.device.createBuffer({size:this.pendingDispatchNumber*2*8,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST}),this.pendingQueries.set(e,this.pendingKernels),this.pendingKernels=[],this.commandEncoder.copyBufferToBuffer(this.queryResolveBuffer,0,e,0,this.pendingDispatchNumber*2*8)),this.device.queue.submit([this.commandEncoder.finish()]),this.gpuDataManager.refreshPendingBuffers(),this.commandEncoder=null,this.pendingDispatchNumber=0,this.queryType!=="none"&&e.mapAsync(GPUMapMode.READ).then(()=>{var i;let t=new BigUint64Array(e.getMappedRange()),r=this.pendingQueries.get(e);for(let a=0;a<t.length/2;a++){let s=r[a],n=s.kernelId,l=this.kernels.get(n),d=l.kernelType,p=l.kernelName,f=s.programName,c=s.inputTensorViews,u=s.outputTensorViews,y=t[a*2],w=t[a*2+1];typeof this.queryTimeBase>"u"&&(this.queryTimeBase=y);let $=Number(y-this.queryTimeBase),b=Number(w-this.queryTimeBase);if(!Number.isSafeInteger($)||!Number.isSafeInteger(b))throw new RangeError("incorrect timestamp range");if((i=this.env.webgpu.profiling)!=null&&i.ondata)this.env.webgpu.profiling.ondata({version:1,inputsMetadata:c.map(x=>({dims:x.dims,dataType:kt(x.dataType)})),outputsMetadata:u.map(x=>({dims:x.dims,dataType:kt(x.dataType)})),kernelId:n,kernelType:d,kernelName:p,programName:f,startTime:$,endTime:b});else{let x="";c.forEach((k,S)=>{x+=`input[${S}]: [${k.dims}] | ${kt(k.dataType)}, `});let v="";u.forEach((k,S)=>{v+=`output[${S}]: [${k.dims}] | ${kt(k.dataType)}, `}),console.log(`[profiling] kernel "${n}|${d}|${p}|${f}" ${x}${v}execution time: ${b-$} ns`)}zr("GPU",`${f}::${y}::${w}`)}e.unmap(),this.pendingQueries.delete(e)}),He()}run(e,t,r,i,a,s){Je(e.name);let n=[];for(let v=0;v<t.length;++v){let k=t[v].data;if(k===0)continue;let S=this.gpuDataManager.get(k);if(!S)throw new Error(`no GPU data for input: ${k}`);n.push(S)}let{outputs:l,dispatchGroup:d,programUniforms:p}=e.getRunData(t),f=r.length===0?l.map((v,k)=>k):r;if(f.length!==l.length)throw new Error(`Output size ${f.length} must be equal to ${l.length}.`);let c=[],u=[];for(let v=0;v<l.length;++v){if(!Number.isInteger(f[v])||f[v]<-3||f[v]>=s)throw new Error(`Invalid output index: ${f[v]}`);if(f[v]===-3)continue;let k=f[v]===-1,S=f[v]===-2,E=k||S?a(l[v].dataType,l[v].dims):i(f[v],l[v].dataType,l[v].dims);if(c.push(E),E.data===0)continue;let z=this.gpuDataManager.get(E.data);if(!z)throw new Error(`no GPU data for output: ${E.data}`);if(k&&this.temporaryData.push(z),S){let T=this.kernelPersistentData.get(this.currentKernelId);T||(T=[],this.kernelPersistentData.set(this.currentKernelId,T)),T.push(z)}u.push(z)}if(n.length!==t.length||u.length!==c.length){if(u.length===0)return He(e.name),c;throw new Error(`Program ${e.name} has zero-sized tensor(s) in inputs or outputs. This is not supported now.`)}let y;if(p){let v=0,k=[];p.forEach(T=>{let M=typeof T.data=="number"?[T.data]:T.data;if(M.length===0)return;let W=T.type===10?2:4,V,J;T.type===10?(J=M.length>4?16:M.length>2?8:M.length*W,V=M.length>4?16:W*M.length):(J=M.length<=2?M.length*W:16,V=16),v=Math.ceil(v/J)*J,k.push(v);let ee=T.type===10?8:4;v+=M.length>4?Math.ceil(M.length/ee)*V:M.length*W});let S=16;v=Math.ceil(v/S)*S;let E=new ArrayBuffer(v);p.forEach((T,M)=>{let W=k[M],V=typeof T.data=="number"?[T.data]:T.data;if(T.type===6)new Int32Array(E,W,V.length).set(V);else if(T.type===12)new Uint32Array(E,W,V.length).set(V);else if(T.type===10)new Uint16Array(E,W,V.length).set(V);else if(T.type===1)new Float32Array(E,W,V.length).set(V);else throw new Error(`Unsupported uniform type: ${kt(T.type)}`)});let z=this.gpuDataManager.create(v,GPUBufferUsage.COPY_DST|GPUBufferUsage.UNIFORM);this.device.queue.writeBuffer(z.buffer,0,E,0,v),this.gpuDataManager.release(z.id),y={offset:0,size:v,buffer:z.buffer}}let w=this.programManager.normalizeDispatchGroupSize(d),$=w[1]===1&&w[2]===1,b=bl(e,t,$),x=this.programManager.getArtifact(b);if(x||(x=this.programManager.build(e,w),this.programManager.setArtifact(b,x),ce("info",()=>`[artifact] key: ${b}, programName: ${e.name}`)),p&&x.uniformVariablesInfo){if(p.length!==x.uniformVariablesInfo.length)throw new Error(`Uniform variables count mismatch: expect ${x.uniformVariablesInfo.length}, got ${p.length} in program "${x.programInfo.name}".`);for(let v=0;v<p.length;v++){let k=p[v],S=k.type,E=typeof k.data=="number"?1:k.data.length,[z,T]=x.uniformVariablesInfo[v];if(S!==z||E!==T)throw new Error(`Uniform variable ${v} mismatch: expect type ${z} with size ${T}, got type ${S} with size ${E} in program "${x.programInfo.name}".`)}}if(ce("info",()=>`[ProgramManager] run "${e.name}" (key=${b}) with ${w[0]}x${w[1]}x${w[2]}`),this.queryType!=="none"||this.sessionStatus==="capturing"){let v={kernelId:this.currentKernelId,programName:x.programInfo.name,inputTensorViews:t,outputTensorViews:c};this.pendingKernels.push(v),this.sessionStatus==="capturing"&&this.capturedPendingKernels.get(this.currentSessionId).push(v)}return this.programManager.run(x,n,u,w,y),He(e.name),c}upload(e,t){this.gpuDataManager.upload(e,t)}memcpy(e,t){this.gpuDataManager.memcpy(e,t)}async download(e,t){await this.gpuDataManager.download(e,t)}alloc(e){return this.gpuDataManager.create(e).id}free(e){return this.gpuDataManager.release(e)}createKernel(e,t,r,i){let a=Wh.get(e);if(!a)throw new Error(`kernel not implemented: ${e}`);let s={kernelType:e,kernelName:i,kernelEntry:a[0],attributes:[a[1],r]};this.kernels.set(t,s)}releaseKernel(e){let t=this.kernelPersistentData.get(e);if(t){for(let r of t)this.gpuDataManager.release(r.id);this.kernelPersistentData.delete(e)}this.kernelCustomData.delete(e),this.kernels.delete(e)}computeKernel(e,t,r){let i=this.kernels.get(e);if(!i)throw new Error(`kernel not created: ${e}`);let a=i.kernelType,s=i.kernelName,n=i.kernelEntry,l=i.attributes;if(this.currentKernelId!==null)throw new Error(`kernel "[${a}] ${s}" is not allowed to be called recursively`);this.currentKernelId=e,l[0]&&(l[1]=l[0](l[1]),l[0]=void 0),ce("info",()=>`[WebGPU] Start to run kernel "[${a}] ${s}"...`);let d=this.env.debug;this.temporaryData=[];try{return d&&this.device.pushErrorScope("validation"),n(t,l[1]),0}catch(p){return r.push(Promise.resolve(`[WebGPU] Kernel "[${a}] ${s}" failed. ${p}`)),1}finally{d&&r.push(this.device.popErrorScope().then(p=>p?`GPU validation error for kernel "[${a}] ${s}": ${p.message}`:null));for(let p of this.temporaryData)this.gpuDataManager.release(p.id);this.temporaryData=[],this.currentKernelId=null}}registerBuffer(e,t,r,i){let a=this.sessionExternalDataMapping.get(e);a||(a=new Map,this.sessionExternalDataMapping.set(e,a));let s=a.get(t),n=this.gpuDataManager.registerExternalBuffer(r,i,s);return a.set(t,[n,r]),n}unregisterBuffers(e){let t=this.sessionExternalDataMapping.get(e);t&&(t.forEach(r=>this.gpuDataManager.unregisterExternalBuffer(r[0])),this.sessionExternalDataMapping.delete(e))}getBuffer(e){let t=this.gpuDataManager.get(e);if(!t)throw new Error(`no GPU data for buffer: ${e}`);return t.buffer}createDownloader(e,t,r){return async()=>{let i=await ta(this,e,t);return Ca(i.buffer,r)}}writeTimestamp(e){this.queryType==="inside-passes"&&this.computePassEncoder.writeTimestamp(this.querySet,e)}setQueryType(){var e;this.queryType="none",(((e=this.env.webgpu.profiling)==null?void 0:e.mode)==="default"||(typeof this.env.trace>"u"?this.env.wasm.trace:this.env.trace))&&(this.device.features.has("chromium-experimental-timestamp-query-inside-passes")?this.queryType="inside-passes":this.device.features.has("timestamp-query")&&(this.queryType="at-passes"),this.queryType!=="none"&&typeof this.querySet>"u"&&(this.querySet=this.device.createQuerySet({type:"timestamp",count:this.maxDispatchNumber*2}),this.queryResolveBuffer=this.device.createBuffer({size:this.maxDispatchNumber*2*8,usage:GPUBufferUsage.COPY_SRC|GPUBufferUsage.QUERY_RESOLVE})))}captureBegin(){ce("info","captureBegin"),this.capturedCommandList.get(this.currentSessionId)||this.capturedCommandList.set(this.currentSessionId,[]),this.capturedPendingKernels.get(this.currentSessionId)||this.capturedPendingKernels.set(this.currentSessionId,[]),this.flush(),this.sessionStatus="capturing"}captureEnd(){ce("info","captureEnd"),this.flush(),this.sessionStatus="default"}replay(){ce("info","replay"),this.sessionStatus="replaying";let e=this.capturedCommandList.get(this.currentSessionId),t=this.capturedPendingKernels.get(this.currentSessionId),r=e.length;this.pendingKernels=[];for(let i=0;i<r;i++){let a=this.getComputePassEncoder(),s=e[i];this.writeTimestamp(this.pendingDispatchNumber*2),a.setPipeline(s.computePipeline),a.setBindGroup(0,s.bindGroup),a.dispatchWorkgroups(...s.dispatchGroup),this.writeTimestamp(this.pendingDispatchNumber*2+1),this.pendingDispatchNumber++,this.queryType!=="none"&&this.pendingKernels.push(t[i]),(this.pendingDispatchNumber>=this.maxDispatchNumber||this.queryType==="at-passes")&&this.endComputePass(),this.pendingDispatchNumber>=this.maxDispatchNumber&&this.flush()}this.flush(),this.sessionStatus="default"}onReleaseSession(e){this.unregisterBuffers(e),this.capturedCommandList.has(e)&&this.capturedCommandList.delete(e),this.capturedPendingKernels.has(e)&&this.capturedPendingKernels.delete(e),this.gpuDataManager.onReleaseSession(e)}onRunStart(e){this.currentSessionId=e,this.setQueryType()}}}),Sl,Ki,Yi,kl,Lh,Pm=D(()=>{et(),Sl=1,Ki=()=>Sl++,Yi=class{constructor(e,t){this.mlContext=e,this.tensorEntry=t,this.tensorCache=t?[t]:[]}get tensor(){var e;return(e=this.tensorEntry)==null?void 0:e[0]}get context(){if(!this.mlContext)throw new Error("MLContext has not been set.");return this.mlContext}set context(e){if(this.mlContext&&this.mlContext!==e)throw new Error("MLTensor in use in a different MLContext.");this.mlContext=e}destroy(){for(let[e]of this.tensorCache)e.destroy();this.tensorCache=[],this.tensorEntry=void 0}trySelectTensor(e,t){for(let[r,i,a]of this.tensorCache)if(t===r){if(this.context!==e)throw new Error("MLTensor cannot be registered with a different MLContext.");return this.tensorEntry=[r,i,a],!0}return!1}async ensureTensor(e,t,r){var s;if(this.tensorEntry){let[n,l,d]=this.tensorEntry;if(l===e&&d.every((p,f)=>p===t[f]))return n}for(let[n,l,d]of this.tensorCache)if(l===e&&d.every((p,f)=>p===t[f])){if(r&&this.tensorEntry){ce("verbose",()=>`[WebNN] Slowdown may occur, having to copy existing tensor {dataType: ${e}, shape: ${t}}`);let p=await this.context.readTensor(this.tensorEntry[0]);this.context.writeTensor(n,p)}return this.tensorEntry=[n,l,d],n}ce("verbose",()=>`[WebNN] MLContext.createTensor {dataType: ${e}, shape: ${t}}`);let i=MLTensorUsage.READ|MLTensorUsage.WRITE,a=await this.context.createTensor({dataType:e,shape:t,dimensions:t,usage:i});return this.tensorEntry=[a,e,t],this.tensorCache.push(this.tensorEntry),this.activeUpload&&((s=this.mlContext)==null||s.writeTensor(a,this.activeUpload),this.activeUpload=void 0),a}upload(e){var t;if(!this.tensorEntry){this.activeUpload=new Uint8Array(e);return}(t=this.mlContext)==null||t.writeTensor(this.tensorEntry[0],e)}async download(e){if(this.activeUpload)if(e){e instanceof ArrayBuffer?new Uint8Array(e).set(this.activeUpload):new Uint8Array(e.buffer,e.byteOffset,e.byteLength).set(this.activeUpload);return}else return this.activeUpload.buffer;if(!this.tensorEntry)throw new Error("Tensor has not been created.");return e?this.context.readTensor(this.tensorEntry[0],e):this.context.readTensor(this.tensorEntry[0])}},kl=class{constructor(e){this.backend=e,this.tensorsById=new Map,this.tensorIdsByContext=new Map}reserveTensorId(){let e=Ki();return this.tensorsById.set(e,new Yi),e}releaseTensorId(e){let t=this.tensorsById.get(e);if(t){t.destroy(),this.tensorsById.delete(e);for(let[r,i]of this.tensorIdsByContext)if(i.has(e)){i.delete(e),i.size===0&&this.tensorIdsByContext.delete(r);break}}}async ensureTensor(e,t,r,i){var s;ce("verbose",()=>`[WebNN] TensorManager.ensureTensor {tensorId: ${e}, dataType: ${t}, shape: ${r}, copyOld: ${i}}`);let a=this.tensorsById.get(e);if(!a)throw new Error("Tensor not found.");return a.context=this.backend.currentContext,this.tensorIdsByContext.has(this.backend.currentContext)||this.tensorIdsByContext.set(this.backend.currentContext,new Set),(s=this.tensorIdsByContext.get(this.backend.currentContext))==null||s.add(e),a.ensureTensor(t,r,i)}upload(e,t){this.tensorsById.get(e).upload(t)}async download(e,t){return ce("verbose",()=>`[WebNN] TensorManager.download {tensorId: ${e}, dstBuffer: ${t==null?void 0:t.byteLength}}`),this.tensorsById.get(e).download(t)}releaseTensorsForContext(e){let t=this.tensorIdsByContext.get(e);if(t){for(let r of t)this.tensorsById.get(r).destroy(),this.tensorsById.delete(r);this.tensorIdsByContext.delete(e)}}registerTensor(e,t,r,i){for(let[n,l]of this.tensorsById)if(l.trySelectTensor(e,t))return n;let a=Ki();this.tensorsById.set(a,new Yi(e,[t,r,i]));let s=this.tensorIdsByContext.get(e);return s||(s=new Set,this.tensorIdsByContext.set(e,s)),s.add(a),a}},Lh=(...e)=>new kl(...e)}),Zi,jh,Dm=D(()=>{X(),Et(),sd(),Pm(),et(),Zi=new Map([[1,"float32"],[10,"float16"],[6,"int32"],[12,"uint32"],[7,"int64"],[13,"uint64"],[3,"int8"],[2,"uint8"],[9,"uint8"]]),jh=class{constructor(e){this.tensorManager=Lh(this),this.mlContextBySessionId=new Map,this.sessionIdsByMLContext=new Map,Ea(e.logLevel,!!e.debug)}get currentSessionId(){if(this.activeSessionId===void 0)throw new Error("No active session");return this.activeSessionId}onRunStart(e){this.activeSessionId=e}get currentContext(){let e=this.getMLContext(this.currentSessionId);if(!e)throw new Error(`No MLContext found for session ${this.currentSessionId}`);return e}registerMLContext(e,t){this.mlContextBySessionId.set(e,t);let r=this.sessionIdsByMLContext.get(t);r||(r=new Set,this.sessionIdsByMLContext.set(t,r)),r.add(e)}onReleaseSession(e){let t=this.mlContextBySessionId.get(e);if(!t)return;this.mlContextBySessionId.delete(e);let r=this.sessionIdsByMLContext.get(t);r.delete(e),r.size===0&&(this.sessionIdsByMLContext.delete(t),this.tensorManager.releaseTensorsForContext(t))}getMLContext(e){return this.mlContextBySessionId.get(e)}reserveTensorId(){return this.tensorManager.reserveTensorId()}releaseTensorId(e){ce("verbose",()=>`[WebNN] releaseTensorId {tensorId: ${e}}`),this.tensorManager.releaseTensorId(e)}async ensureTensor(e,t,r,i){let a=Zi.get(t);if(!a)throw new Error(`Unsupported ONNX data type: ${t}`);return this.tensorManager.ensureTensor(e,a,r,i)}uploadTensor(e,t){if(!Ee().shouldTransferToMLTensor)throw new Error("Trying to upload to a MLTensor while shouldTransferToMLTensor is false");ce("verbose",()=>`[WebNN] uploadTensor {tensorId: ${e}, data: ${t.byteLength}}`),this.tensorManager.upload(e,t)}async downloadTensor(e,t){return this.tensorManager.download(e,t)}createMLTensorDownloader(e,t){return async()=>{let r=await this.tensorManager.download(e);return Ca(r,t)}}registerMLTensor(e,t,r){let i=Zi.get(t);if(!i)throw new Error(`Unsupported ONNX data type: ${t}`);let a=this.tensorManager.registerTensor(this.currentContext,e,i,r);return ce("verbose",()=>`[WebNN] registerMLTensor {tensor: ${e}, dataType: ${i}, dimensions: ${r}} -> {tensorId: ${a}}`),a}flush(){}}}),Gh={};er(Gh,{init:()=>Fh});var Sr,El,Fh,Um=D(()=>{X(),Mm(),et(),te(),Dm(),Sr=class Hh{constructor(t,r,i,a){this.module=t,this.dataType=r,this.data=i,this.dims=a}getFloat32Array(){if(this.dataType!==1)throw new Error("Invalid data type");let t=O.size(this.dims);return t===0?new Float32Array:new Float32Array(this.module.HEAP8.buffer,this.data,t)}getBigInt64Array(){if(this.dataType!==7)throw new Error("Invalid data type");let t=O.size(this.dims);return t===0?new BigInt64Array:new BigInt64Array(this.module.HEAP8.buffer,this.data,t)}getInt32Array(){if(this.dataType!==6)throw new Error("Invalid data type");let t=O.size(this.dims);return t===0?new Int32Array:new Int32Array(this.module.HEAP8.buffer,this.data,t)}getUint16Array(){if(this.dataType!==10&&this.dataType!==4)throw new Error("Invalid data type");let t=O.size(this.dims);return t===0?new Uint16Array:new Uint16Array(this.module.HEAP8.buffer,this.data,t)}reshape(t){if(O.size(t)!==O.size(this.dims))throw new Error("Invalid new shape");return new Hh(this.module,this.dataType,this.data,t)}},El=class{constructor(e,t,r){this.module=e,this.backend=t,this.customDataOffset=0,this.customDataSize=0,this.adapterInfo=t.adapterInfo;let i=e.HEAPU32,a=r>>>2;this.opKernelContext=i[a++];let s=i[a++];this.outputCount=i[a++],this.customDataOffset=i[a++],this.customDataSize=i[a++];let n=[];for(let l=0;l<s;l++){let d=i[a++],p=i[a++],f=i[a++],c=[];for(let u=0;u<f;u++)c.push(i[a++]);n.push(new Sr(e,d,p,c))}this.inputs=n}get kernelCustomData(){return this.backend.currentKernelCustomData}get customDataBuffer(){return this.module.HEAPU8.subarray(this.customDataOffset,this.customDataOffset+this.customDataSize)}getMaxComputeWorkgroupSizes(){return[this.backend.device.limits.maxComputeWorkgroupSizeX,this.backend.device.limits.maxComputeWorkgroupSizeY,this.backend.device.limits.maxComputeWorkgroupSizeZ]}getMaxComputeWorkgroupStoragesize(){return this.backend.device.limits.maxComputeWorkgroupStorageSize}compute(e,t){var n;let r=((n=t==null?void 0:t.inputs)==null?void 0:n.map(l=>typeof l=="number"?this.inputs[l]:l))??this.inputs,i=(t==null?void 0:t.outputs)??[],a=(l,d,p)=>new Sr(this.module,d,this.output(l,p),p),s=(l,d)=>{let p=Bt(l,d);if(!p)throw new Error(`Unsupported data type: ${l}`);let f=p>0?this.backend.gpuDataManager.create(p).id:0;return new Sr(this.module,l,f,d)};return this.backend.run(e,r,i,a,s,this.outputCount)}output(e,t){let r=this.module.stackSave();try{let i=this.module.stackAlloc((1+t.length)*4),a=i>>2;this.module.HEAPU32[a++]=t.length;for(let s=0;s<t.length;s++)this.module.HEAPU32[a++]=t[s];return this.module._JsepOutput(this.opKernelContext,e,i)}catch(i){throw new Error(`Failed to generate kernel's output[${e}] with dims [${t}]. If you are running with pre-allocated output, please make sure the output type/dims are correct. Error: ${i}`)}finally{this.module.stackRestore(r)}}},Fh=async(e,t,r,i)=>{let a=t.jsepInit;if(!a)throw new Error("Failed to initialize JSEP. The WebAssembly module is not built with JSEP support.");if(e==="webgpu"){let s=new Vh;await s.initialize(r,i),a("webgpu",[s,n=>s.alloc(n),n=>s.free(n),(n,l,d,p=!1)=>{if(p)ce("verbose",()=>`[WebGPU] jsepCopyGpuToGpu: src=${n}, dst=${l}, size=${d}`),s.memcpy(n,l);else{ce("verbose",()=>`[WebGPU] jsepCopyCpuToGpu: dataOffset=${n}, gpuDataId=${l}, size=${d}`);let f=t.HEAPU8.subarray(n>>>0,(n>>>0)+d);s.upload(l,f)}},async(n,l,d)=>{ce("verbose",()=>`[WebGPU] jsepCopyGpuToCpu: gpuDataId=${n}, dataOffset=${l}, size=${d}`),await s.download(n,()=>t.HEAPU8.subarray(l>>>0,(l>>>0)+d))},(n,l,d)=>s.createKernel(n,l,d,t.UTF8ToString(t._JsepGetNodeName(l))),n=>s.releaseKernel(n),(n,l,d,p)=>{ce("verbose",()=>`[WebGPU] jsepRun: sessionHandle=${d}, kernel=${n}, contextDataOffset=${l}`);let f=new El(t,s,l);return s.computeKernel(n,f,p)},()=>s.captureBegin(),()=>s.captureEnd(),()=>s.replay()])}else{let s=new jh(r);a("webnn",[s,()=>s.reserveTensorId(),n=>s.releaseTensorId(n),async(n,l,d,p)=>s.ensureTensor(n,l,d,p),(n,l)=>{s.uploadTensor(n,l)},async(n,l)=>s.downloadTensor(n,l)])}}}),Cl,Da,Ua,dt,Tl,Dr,Na,Wa,Qi,qa,Va,La,Kh=D(()=>{Ff(),Hf(),X(),Et(),va(),nd(),Cl=(e,t)=>{Ee()._OrtInit(e,t)!==0&&we("Can't initialize onnxruntime.")},Da=async e=>{Cl(e.wasm.numThreads,Or(e.logLevel))},Ua=async(e,t)=>{{let r=(Um(),Ir(Gh)).init;if(t==="webgpu"){if(typeof navigator>"u"||!navigator.gpu)throw new Error("WebGPU is not supported in current environment");let i=e.webgpu.adapter;if(i){if(typeof i.limits!="object"||typeof i.features!="object"||typeof i.requestDevice!="function")throw new Error("Invalid GPU adapter set in `env.webgpu.adapter`. It must be a GPUAdapter object.")}else{let a=e.webgpu.powerPreference;if(a!==void 0&&a!=="low-power"&&a!=="high-performance")throw new Error(`Invalid powerPreference setting: "${a}"`);let s=e.webgpu.forceFallbackAdapter;if(s!==void 0&&typeof s!="boolean")throw new Error(`Invalid forceFallbackAdapter setting: "${s}"`);if(i=await navigator.gpu.requestAdapter({powerPreference:a,forceFallbackAdapter:s}),!i)throw new Error('Failed to get GPU adapter. You may need to enable flag "--enable-unsafe-webgpu" if you are using Chrome.')}await r("webgpu",Ee(),e,i)}if(t==="webnn"){if(typeof navigator>"u"||!navigator.ml)throw new Error("WebNN is not supported in current environment");await r("webnn",Ee(),e)}}},dt=new Map,Tl=e=>{let t=Ee(),r=t.stackSave();try{let i=t.stackAlloc(8);return t._OrtGetInputOutputCount(e,i,i+4)!==0&&we("Can't get session input/output count."),[t.HEAP32[i/4],t.HEAP32[i/4+1]]}finally{t.stackRestore(r)}},Dr=e=>{let t=Ee(),r=t._malloc(e.byteLength);if(r===0)throw new Error(`Can't create a session. failed to allocate a buffer of size ${e.byteLength}.`);return t.HEAPU8.set(e,r),[r,e.byteLength]},Na=async(e,t)=>{var c,u;let r,i,a=Ee();Array.isArray(e)?[r,i]=e:e.buffer===a.HEAPU8.buffer?[r,i]=[e.byteOffset,e.byteLength]:[r,i]=Dr(e);let s=0,n=0,l=0,d=[],p=[],f=[];try{if([n,d]=ad(t),(t==null?void 0:t.externalData)&&a.mountExternalData){let S=[];for(let E of t.externalData){let z=typeof E=="string"?E:E.path;S.push(ka(typeof E=="string"?E:E.data).then(T=>{a.mountExternalData(z,T)}))}await Promise.all(S)}for(let S of(t==null?void 0:t.executionProviders)??[])if((typeof S=="string"?S:S.name)==="webnn"){if(a.shouldTransferToMLTensor=!1,a.currentContext)throw new Error("WebNN execution provider is already set.");if(typeof S!="string"){let E=S,z=E==null?void 0:E.context,T=E==null?void 0:E.gpuDevice,M=E==null?void 0:E.deviceType,W=E==null?void 0:E.numThreads,V=E==null?void 0:E.powerPreference;z?a.currentContext=z:T?a.currentContext=await navigator.ml.createContext(T):a.currentContext=await navigator.ml.createContext({deviceType:M,numThreads:W,powerPreference:V})}else a.currentContext=await navigator.ml.createContext();break}s=await a._OrtCreateSession(r,i,n),s===0&&we("Can't create a session."),a.currentContext&&(a.jsepRegisterMLContext(s,a.currentContext),a.currentContext=void 0,a.shouldTransferToMLTensor=!0);let[y,w]=Tl(s),$=!!(t!=null&&t.enableGraphCapture),b=[],x=[],v=[];for(let S=0;S<y;S++){let E=a._OrtGetInputName(s,S);E===0&&we("Can't get an input name."),p.push(E),b.push(a.UTF8ToString(E))}for(let S=0;S<w;S++){let E=a._OrtGetOutputName(s,S);E===0&&we("Can't get an output name."),f.push(E);let z=a.UTF8ToString(E);x.push(z);{if($&&(t==null?void 0:t.preferredOutputLocation)===void 0){v.push("gpu-buffer");continue}let T=typeof(t==null?void 0:t.preferredOutputLocation)=="string"?t.preferredOutputLocation:((c=t==null?void 0:t.preferredOutputLocation)==null?void 0:c[z])??"cpu";if(T!=="cpu"&&T!=="cpu-pinned"&&T!=="gpu-buffer"&&T!=="ml-tensor")throw new Error(`Not supported preferred output location: ${T}.`);if($&&T!=="gpu-buffer")throw new Error(`Not supported preferred output location: ${T}. Only 'gpu-buffer' location is supported when enableGraphCapture is true.`);v.push(T)}}let k=null;return v.some(S=>S==="gpu-buffer"||S==="ml-tensor")&&(l=a._OrtCreateBinding(s),l===0&&we("Can't create IO binding."),k={handle:l,outputPreferredLocations:v,outputPreferredLocationsEncoded:v.map(S=>ea(S))}),dt.set(s,[s,p,f,k,$,!1]),[s,b,x]}catch(y){throw p.forEach(w=>a._OrtFree(w)),f.forEach(w=>a._OrtFree(w)),l!==0&&a._OrtReleaseBinding(l),s!==0&&a._OrtReleaseSession(s),y}finally{a._free(r),n!==0&&a._OrtReleaseSessionOptions(n),d.forEach(y=>a._free(y)),(u=a.unmountExternalData)==null||u.call(a)}},Wa=e=>{var d;let t=Ee(),r=dt.get(e);if(!r)throw new Error(`cannot release session. invalid session id: ${e}`);let[i,a,s,n,l]=r;n&&(l&&t._OrtClearBoundOutputs(n.handle),t._OrtReleaseBinding(n.handle)),(d=t.jsepOnReleaseSession)==null||d.call(t,e),a.forEach(p=>t._OrtFree(p)),s.forEach(p=>t._OrtFree(p)),t._OrtReleaseSession(i),dt.delete(e)},Qi=(e,t,r,i,a,s=!1)=>{if(!e){t.push(0);return}let n=Ee(),l=e[0],d=e[1],p=e[3],f,c;if(l==="string"&&(p==="gpu-buffer"||p==="ml-tensor"))throw new Error("String tensor is not supported on GPU.");if(s&&p!=="gpu-buffer")throw new Error(`External buffer must be provided for input/output index ${a} when enableGraphCapture is true.`);if(p==="gpu-buffer"){let w=e[2].gpuBuffer;c=Bt(Kt(l),d);let $=n.jsepRegisterBuffer;if(!$)throw new Error('Tensor location "gpu-buffer" is not supported without using WebGPU.');f=$(i,a,w,c)}else if(p==="ml-tensor"){let w=e[2].mlTensor;c=Bt(Kt(l),d);let $=n.jsepRegisterMLTensor;if(!$)throw new Error('Tensor location "ml-tensor" is not supported without using WebNN.');f=$(w,Kt(l),d)}else{let w=e[2];if(Array.isArray(w)){c=4*w.length,f=n._malloc(c),r.push(f);let $=f/4;for(let b=0;b<w.length;b++){if(typeof w[b]!="string")throw new TypeError(`tensor data at index ${b} is not a string`);n.HEAPU32[$++]=Ie(w[b],r)}}else c=w.byteLength,f=n._malloc(c),r.push(f),n.HEAPU8.set(new Uint8Array(w.buffer,w.byteOffset,c),f)}let u=n.stackSave(),y=n.stackAlloc(4*d.length);try{let w=y/4;d.forEach(b=>n.HEAP32[w++]=b);let $=n._OrtCreateTensor(Kt(l),f,c,y,d.length,ea(p));$===0&&we(`Can't create tensor for input/output. session=${i}, index=${a}.`),t.push($)}finally{n.stackRestore(u)}},qa=async(e,t,r,i,a,s)=>{var V,J;let n=Ee(),l=dt.get(e);if(!l)throw new Error(`cannot run inference. invalid session id: ${e}`);let d=l[0],p=l[1],f=l[2],c=l[3],u=l[4],y=l[5],w=t.length,$=i.length,b=0,x=[],v=[],k=[],S=[],E=n.stackSave(),z=n.stackAlloc(w*4),T=n.stackAlloc(w*4),M=n.stackAlloc($*4),W=n.stackAlloc($*4);try{(V=n.jsepOnRunStart)==null||V.call(n,d),[b,x]=id(s);for(let j=0;j<w;j++)Qi(r[j],v,S,e,t[j],u);for(let j=0;j<$;j++)Qi(a[j],k,S,e,w+i[j],u);let ee=z/4,H=T/4,oe=M/4,he=W/4;for(let j=0;j<w;j++)n.HEAPU32[ee++]=v[j],n.HEAPU32[H++]=p[t[j]];for(let j=0;j<$;j++)n.HEAPU32[oe++]=k[j],n.HEAPU32[he++]=f[i[j]];if(c&&!y){let{handle:j,outputPreferredLocations:Z,outputPreferredLocationsEncoded:ne}=c;if(p.length!==w)throw new Error(`input count from feeds (${w}) is expected to be always equal to model's input count (${p.length}).`);for(let A=0;A<w;A++){let U=t[A];await n._OrtBindInput(j,p[U],v[A])!==0&&we(`Can't bind input[${A}] for session=${e}.`)}for(let A=0;A<$;A++){let U=i[A];(J=a[A])!=null&&J[3]?n._OrtBindOutput(j,f[U],k[A],0)!==0&&we(`Can't bind pre-allocated output[${A}] for session=${e}.`):n._OrtBindOutput(j,f[U],0,ne[U])!==0&&we(`Can't bind output[${A}] to ${Z[A]} for session=${e}.`)}dt.set(e,[d,p,f,c,u,!0])}let ie;c?ie=await n._OrtRunWithBinding(d,c.handle,$,M,b):ie=await n._OrtRun(d,T,z,w,W,$,M,b),ie!==0&&we("failed to call OrtRun().");let de=[];for(let j=0;j<$;j++){let Z=n.HEAPU32[M/4+j];if(Z===k[j]){de.push(a[j]);continue}let ne=n.stackSave(),A=n.stackAlloc(4*4),U=!1,Q,ue=0;try{n._OrtGetTensorData(Z,A,A+4,A+8,A+12)!==0&&we(`Can't access output tensor data on index ${j}.`);let $e=A/4,ve=n.HEAPU32[$e++];ue=n.HEAPU32[$e++];let it=n.HEAPU32[$e++],tr=n.HEAPU32[$e++],Oe=[];for(let xe=0;xe<tr;xe++)Oe.push(n.HEAPU32[it/4+xe]);n._OrtFree(it);let ke=Oe.reduce((xe,Te)=>xe*Te,1);Q=kt(ve);let wt=c==null?void 0:c.outputPreferredLocations[i[j]];if(Q==="string"){if(wt==="gpu-buffer"||wt==="ml-tensor")throw new Error("String tensor is not supported on GPU.");let xe=[],Te=ue/4;for(let Ue=0;Ue<ke;Ue++){let at=n.HEAPU32[Te++],rr=Ue===ke-1?void 0:n.HEAPU32[Te]-at;xe.push(n.UTF8ToString(at,rr))}de.push([Q,Oe,xe,"cpu"])}else if(wt==="gpu-buffer"&&ke>0){let xe=n.jsepGetBuffer;if(!xe)throw new Error('preferredLocation "gpu-buffer" is not supported without using WebGPU.');let Te=xe(ue),Ue=Bt(ve,ke);if(Ue===void 0||!xa(Q))throw new Error(`Unsupported data type: ${Q}`);U=!0,de.push([Q,Oe,{gpuBuffer:Te,download:n.jsepCreateDownloader(Te,Ue,Q),dispose:()=>{n._OrtReleaseTensor(Z)}},"gpu-buffer"])}else if(wt==="ml-tensor"&&ke>0){let xe=n.jsepEnsureTensor;if(!xe)throw new Error('preferredLocation "ml-tensor" is not supported without using WebNN.');if(Bt(ve,ke)===void 0||!Sa(Q))throw new Error(`Unsupported data type: ${Q}`);let Te=await xe(ue,ve,Oe,!1);U=!0,de.push([Q,Oe,{mlTensor:Te,download:n.jsepCreateMLTensorDownloader(ue,Q),dispose:()=>{n.jsepReleaseTensorId(ue),n._OrtReleaseTensor(Z)}},"ml-tensor"])}else{let xe=ba(Q),Te=new xe(ke);new Uint8Array(Te.buffer,Te.byteOffset,Te.byteLength).set(n.HEAPU8.subarray(ue,ue+Te.byteLength)),de.push([Q,Oe,Te,"cpu"])}}finally{n.stackRestore(ne),Q==="string"&&ue&&n._free(ue),U||n._OrtReleaseTensor(Z)}}return c&&!u&&(n._OrtClearBoundOutputs(c.handle),dt.set(e,[d,p,f,c,u,!1])),de}finally{n.stackRestore(E),v.forEach(ee=>n._OrtReleaseTensor(ee)),k.forEach(ee=>n._OrtReleaseTensor(ee)),S.forEach(ee=>n._free(ee)),b!==0&&n._OrtReleaseRunOptions(b),x.forEach(ee=>n._free(ee))}},Va=e=>{let t=Ee(),r=dt.get(e);if(!r)throw new Error("invalid session id");let i=r[0],a=t._OrtEndProfiling(i);a===0&&we("Can't get an profile file name."),t._OrtFree(a)},La=e=>{let t=[];for(let r of e){let i=r[2];!Array.isArray(i)&&"buffer"in i&&t.push(i.buffer)}return t}}),pt,Me,At,Gt,Ft,kr,Xi,Er,bt,xt,Il,Yh,Zh,Qh,Xh,Jh,ec,tc,rc=D(()=>{Ke(),Kh(),Et(),Ur(),pt=()=>!!me.wasm.proxy&&typeof document<"u",At=!1,Gt=!1,Ft=!1,Er=new Map,bt=(e,t)=>{let r=Er.get(e);r?r.push(t):Er.set(e,[t])},xt=()=>{if(At||!Gt||Ft||!Me)throw new Error("worker not ready")},Il=e=>{switch(e.data.type){case"init-wasm":At=!1,e.data.err?(Ft=!0,Xi[1](e.data.err)):(Gt=!0,Xi[0]()),kr&&(URL.revokeObjectURL(kr),kr=void 0);break;case"init-ep":case"copy-from":case"create":case"release":case"run":case"end-profiling":{let t=Er.get(e.data.type);e.data.err?t.shift()[1](e.data.err):t.shift()[0](e.data.out);break}}},Yh=async()=>{if(!Gt){if(At)throw new Error("multiple calls to 'initWasm()' detected.");if(Ft)throw new Error("previous call to 'initWasm()' failed.");if(At=!0,pt())return new Promise((e,t)=>{Me==null||Me.terminate(),td().then(([r,i])=>{try{Me=i,Me.onerror=s=>t(s),Me.onmessage=Il,Xi=[e,t];let a={type:"init-wasm",in:me};Me.postMessage(a),kr=r}catch(a){t(a)}},t)});try{await _a(me.wasm),await Da(me),Gt=!0}catch(e){throw Ft=!0,e}finally{At=!1}}},Zh=async e=>{if(pt())return xt(),new Promise((t,r)=>{bt("init-ep",[t,r]);let i={type:"init-ep",in:{epName:e,env:me}};Me.postMessage(i)});await Ua(me,e)},Qh=async e=>pt()?(xt(),new Promise((t,r)=>{bt("copy-from",[t,r]);let i={type:"copy-from",in:{buffer:e}};Me.postMessage(i,[e.buffer])})):Dr(e),Xh=async(e,t)=>{if(pt()){if(t!=null&&t.preferredOutputLocation)throw new Error('session option "preferredOutputLocation" is not supported for proxy.');return xt(),new Promise((r,i)=>{bt("create",[r,i]);let a={type:"create",in:{model:e,options:{...t}}},s=[];e instanceof Uint8Array&&s.push(e.buffer),Me.postMessage(a,s)})}else return Na(e,t)},Jh=async e=>{if(pt())return xt(),new Promise((t,r)=>{bt("release",[t,r]);let i={type:"release",in:e};Me.postMessage(i)});Wa(e)},ec=async(e,t,r,i,a,s)=>{if(pt()){if(r.some(n=>n[3]!=="cpu"))throw new Error("input tensor on GPU is not supported for proxy.");if(a.some(n=>n))throw new Error("pre-allocated output tensor is not supported for proxy.");return xt(),new Promise((n,l)=>{bt("run",[n,l]);let d=r,p={type:"run",in:{sessionId:e,inputIndices:t,inputs:d,outputIndices:i,options:s}};Me.postMessage(p,La(d))})}else return qa(e,t,r,i,a,s)},tc=async e=>{if(pt())return xt(),new Promise((t,r)=>{bt("end-profiling",[t,r]);let i={type:"end-profiling",in:e};Me.postMessage(i)});Va(e)}}),Ji,zl,ic,Nm=D(()=>{Ke(),rc(),X(),$a(),nd(),Ji=(e,t)=>{switch(e.location){case"cpu":return[e.type,e.dims,e.data,"cpu"];case"gpu-buffer":return[e.type,e.dims,{gpuBuffer:e.gpuBuffer},"gpu-buffer"];case"ml-tensor":return[e.type,e.dims,{mlTensor:e.mlTensor},"ml-tensor"];default:throw new Error(`invalid data location: ${e.location} for ${t()}`)}},zl=e=>{switch(e[3]){case"cpu":return new Be(e[0],e[2],e[1]);case"gpu-buffer":{let t=e[0];if(!xa(t))throw new Error(`not supported data type: ${t} for deserializing GPU tensor`);let{gpuBuffer:r,download:i,dispose:a}=e[2];return Be.fromGpuBuffer(r,{dataType:t,dims:e[1],download:i,dispose:a})}case"ml-tensor":{let t=e[0];if(!Sa(t))throw new Error(`not supported data type: ${t} for deserializing MLTensor tensor`);let{mlTensor:r,download:i,dispose:a}=e[2];return Be.fromMLTensor(r,{dataType:t,dims:e[1],download:i,dispose:a})}default:throw new Error(`invalid data location: ${e[3]}`)}},ic=class{async fetchModelAndCopyToWasmMemory(e){return Qh(await ka(e))}async loadModel(e,t){Je();let r;typeof e=="string"?r=await this.fetchModelAndCopyToWasmMemory(e):r=e,[this.sessionId,this.inputNames,this.outputNames]=await Xh(r,t),He()}async dispose(){return Jh(this.sessionId)}async run(e,t,r){Je();let i=[],a=[];Object.entries(e).forEach(c=>{let u=c[0],y=c[1],w=this.inputNames.indexOf(u);if(w===-1)throw new Error(`invalid input '${u}'`);i.push(y),a.push(w)});let s=[],n=[];Object.entries(t).forEach(c=>{let u=c[0],y=c[1],w=this.outputNames.indexOf(u);if(w===-1)throw new Error(`invalid output '${u}'`);s.push(y),n.push(w)});let l=i.map((c,u)=>Ji(c,()=>`input "${this.inputNames[a[u]]}"`)),d=s.map((c,u)=>c?Ji(c,()=>`output "${this.outputNames[n[u]]}"`):null),p=await ec(this.sessionId,a,l,n,d,r),f={};for(let c=0;c<p.length;c++)f[this.outputNames[n[c]]]=s[c]??zl(p[c]);return He(),f}startProfiling(){}endProfiling(){tc(this.sessionId)}}}),ac={};er(ac,{OnnxruntimeWebAssemblyBackend:()=>ca,initializeFlags:()=>ha,wasmBackend:()=>nc});var ha,ca,nc,Wm=D(()=>{Ke(),rc(),Nm(),Ur(),ha=()=>{if((typeof me.wasm.initTimeout!="number"||me.wasm.initTimeout<0)&&(me.wasm.initTimeout=0),me.wasm.simd===!1&&console.warn('Deprecated property "env.wasm.simd" is set to false. non-SIMD build is no longer provided, and this setting will be ignored.'),typeof me.wasm.proxy!="boolean"&&(me.wasm.proxy=!1),typeof me.wasm.trace!="boolean"&&(me.wasm.trace=!1),typeof me.wasm.numThreads!="number"||!Number.isInteger(me.wasm.numThreads)||me.wasm.numThreads<=0)if(typeof self<"u"&&!self.crossOriginIsolated)me.wasm.numThreads=1;else{let e=typeof navigator>"u"?Cf("node:os").cpus().length:navigator.hardwareConcurrency;me.wasm.numThreads=Math.min(4,Math.ceil((e||1)/2))}},ca=class{async init(e){ha(),await Yh(),await Zh(e)}async createInferenceSessionHandler(e,t){let r=new ic;return await r.loadModel(e,t),Promise.resolve(r)}},nc=new ca});Ke();Ke();Ke();var qm="1.20.1",Vm=Zl;{let e=(Wm(),Ir(ac)).wasmBackend;Rt("webgpu",e,5),Rt("webnn",e,5),Rt("cpu",e,10),Rt("wasm",e,10)}Object.defineProperty(me.versions,"web",{value:qm,enumerable:!0});/**
* @license
* Copyright 2021 Google LLC. All Rights Reserved.
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
* =============================================================================
*//**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 *//**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */export{Fl as InferenceSession,zr as TRACE,Je as TRACE_FUNC_BEGIN,He as TRACE_FUNC_END,Be as Tensor,Yl as TrainingSession,Vm as default,me as env,Rt as registerBackend};
