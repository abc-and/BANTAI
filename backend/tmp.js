const {loadConfigFromFile} = require('@prisma/config'); 
loadConfigFromFile({}).then(result = console.log(JSON.stringify(result, null, 2)); if (result.error) console.error(JSON.stringify(result.error, null, 2)); }).catch(console.error); 
