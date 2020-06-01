const loaderData = window.wolfcoinsLoader;

let _uuid = 0;

const AsyncFunction = Object.getPrototypeOf(async () => null).constructor;

export const isAsyncFunction = fn => (fn instanceof AsyncFunction);

export const toPrettyJSON = input => JSON.stringify(input, null, '    ');

export const delay = time => new Promise(resolve => setTimeout(resolve, time));

export const objectCopyJSON = input => JSON.parse(JSON.stringify(input));

export const objectCopy = obj => {
	if ( obj === null || typeof obj !== 'object' )
		return obj;

	const target = (obj instanceof Array) ? [] : {};

	for ( let prop in obj )
		target[prop] = objectCopy(obj[prop]);

	return target;
}

export const arrayChunk = (arr, len) => {
	let	chunks = [],
		i = 0,
		n = arr.length;

	while (i < n) {
		chunks.push(arr.slice(i, i += len));
	}

	return chunks;
}

export const promisesAllObj = async obj => {
	const
		keys	= Object.keys(obj),
		resArr	= await Promise.all(Object.values(obj)),
		res		= {};

	for ( let i = 0; i < keys.length; i++ )
		res[keys[i]] = resArr[i];

	return res;
}

export const formatNumber = val => {
	val = parseFloat(val);

	if ( val > 9999 )
		return val.toLocaleString('en-US');
	else
		return String(val);
}

export const padNumber = (n, width, z) => {
	z = z || '0';
	n = n + '';
	return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

export const L = (...args) => {
	const
		style = 'font-size: 0; color: transparent; margin-right: -6px',
		textLogArr = ['%c'];

	for ( let arg of args ) {
		switch ( typeof arg ) {
			case 'undefined':
				arg = 'undefined';
			break;
			case 'object':
				if ( !(arg instanceof Error) )
					arg = JSON.stringify(arg);
			break;
			case 'function':
				if ( arg.name )
					arg = `[function ${arg.name}]`;
				else if ( arg.toString )
					arg = `[function "${arg.toString()}"]`;
				else
					arg = '[function]';
			break;
			default:
				arg = String(arg);
			break;
		}

		textLogArr.push(arg);
	}

	const textLog = textLogArr.join(' ').replace(/[\r\n]+/g, ' '); // replace newlines with spaces

	return [textLog, style, ...args];
}

export const isNumeric = (n) => (!isNaN(parseFloat(n)) && isFinite(n))

export const capitalizeFirstLetter = string => string.charAt(0).toUpperCase() + string.slice(1)

export const uuid = () => _uuid++
