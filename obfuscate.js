const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

// Obfuscation options for maximum protection
const obfuscationOptions = {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 1,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 1,
    debugProtection: true,
    debugProtectionInterval: 4000,
    disableConsoleOutput: true,
    identifierNamesGenerator: 'hexadecimal',
    log: false,
    numbersToExpressions: true,
    renameGlobals: true,
    selfDefending: true,
    simplify: true,
    splitStrings: true,
    splitStringsChunkLength: 5,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayCallsTransformThreshold: 1,
    stringArrayEncoding: ['rc4'],
    stringArrayIndexShift: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayWrappersCount: 5,
    stringArrayWrappersChainedCalls: true,
    stringArrayWrappersParametersMaxCount: 5,
    stringArrayWrappersType: 'function',
    stringArrayThreshold: 1,
    transformObjectKeys: true,
    unicodeEscapeSequence: true
};

// Files to obfuscate
const filesToObfuscate = [
    'src/index.js',
    'public/index.js',
    'public/error.js', 
    'public/search.js',
    'public/register-sw.js'
];

console.log('🔒 Starting code obfuscation...\n');

// Obfuscate each JavaScript file
filesToObfuscate.forEach(filePath => {
    try {
        if (fs.existsSync(filePath)) {
            console.log(`📄 Obfuscating ${filePath}...`);
            
            const sourceCode = fs.readFileSync(filePath, 'utf8');
            const obfuscatedCode = JavaScriptObfuscator.obfuscate(sourceCode, obfuscationOptions).getObfuscatedCode();
            
            // Create backup
            const backupPath = filePath + '.backup';
            fs.writeFileSync(backupPath, sourceCode);
            
            // Write obfuscated code
            fs.writeFileSync(filePath, obfuscatedCode);
            
            console.log(`✅ ${filePath} obfuscated successfully`);
        } else {
            console.log(`⚠️  File not found: ${filePath}`);
        }
    } catch (error) {
        console.error(`❌ Error obfuscating ${filePath}:`, error.message);
    }
});

// Obfuscate HTML by minifying and encoding strings
function obfuscateHTML(htmlContent) {
    // Remove comments and extra whitespace
    let obfuscated = htmlContent
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\s+/g, ' ')
        .replace(/>\s+</g, '><')
        .trim();
    
    // Encode sensitive strings
    obfuscated = obfuscated
        .replace(/vortex/gi, () => Math.random().toString(36).substring(7))
        .replace(/proxy/gi, () => Math.random().toString(36).substring(7))
        .replace(/ultraviolet/gi, () => Math.random().toString(36).substring(7))
        .replace(/uv-/g, () => Math.random().toString(36).substring(2, 5) + '-');
    
    return obfuscated;
}

// Obfuscate CSS by minifying and mangling class names
function obfuscateCSS(cssContent) {
    // Minify CSS
    let obfuscated = cssContent
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s+/g, ' ')
        .replace(/;\s*}/g, '}')
        .replace(/{\s*/g, '{')
        .replace(/;\s*/g, ';')
        .trim();
    
    // Simple class name obfuscation (basic example)
    const classMap = new Map();
    let classCounter = 0;
    
    obfuscated = obfuscated.replace(/\.([a-zA-Z][\w-]*)/g, (match, className) => {
        if (!classMap.has(className)) {
            classMap.set(className, `c${classCounter++}`);
        }
        return '.' + classMap.get(className);
    });
    
    return obfuscated;
}

console.log('\n🎨 Obfuscating HTML and CSS files...\n');

// Obfuscate HTML files
const htmlFiles = ['public/index.html', 'public/404.html'];
htmlFiles.forEach(filePath => {
    try {
        if (fs.existsSync(filePath)) {
            console.log(`🌐 Obfuscating ${filePath}...`);
            
            const htmlContent = fs.readFileSync(filePath, 'utf8');
            const obfuscatedHTML = obfuscateHTML(htmlContent);
            
            // Create backup
            fs.writeFileSync(filePath + '.backup', htmlContent);
            
            // Write obfuscated HTML
            fs.writeFileSync(filePath, obfuscatedHTML);
            
            console.log(`✅ ${filePath} obfuscated successfully`);
        }
    } catch (error) {
        console.error(`❌ Error obfuscating ${filePath}:`, error.message);
    }
});

// Obfuscate CSS files
const cssFiles = ['public/index.css'];
cssFiles.forEach(filePath => {
    try {
        if (fs.existsSync(filePath)) {
            console.log(`��� Obfuscating ${filePath}...`);
            
            const cssContent = fs.readFileSync(filePath, 'utf8');
            const obfuscatedCSS = obfuscateCSS(cssContent);
            
            // Create backup
            fs.writeFileSync(filePath + '.backup', cssContent);
            
            // Write obfuscated CSS
            fs.writeFileSync(filePath, obfuscatedCSS);
            
            console.log(`✅ ${filePath} obfuscated successfully`);
        }
    } catch (error) {
        console.error(`❌ Error obfuscating ${filePath}:`, error.message);
    }
});

console.log('\n🔐 Code obfuscation completed!');
console.log('💾 Original files backed up with .backup extension');
console.log('🚀 Your application is now protected from reverse engineering');
