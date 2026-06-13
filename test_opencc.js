const OpenCC = require('opencc-js');
const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
console.log(converter('春眠不觉晓'));
console.log(converter('床前明月光'));
console.log(converter('白日依山尽'));
