module.exports =
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 580:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.parser = void 0;
const isIdentifier = (x) => x.type === 'Identifier';
const isTsTypeReference = (x) => x.type === 'TSTypeReference';
const isObjectPattern = (x) => x.type === 'ObjectPattern';
exports.default = (fileInfo, { j }) => {
    function addPropsTypeToComponentBody(n) {
        // extract the Prop's type text
        const typeParameterParam = n.node.id.typeAnnotation.typeAnnotation
            .typeParameters.params[0];
        let newTypeAnnotation;
        // form of React.FC<Props> or React.SFC<Props>
        if (isTsTypeReference(typeParameterParam)) {
            const { loc, ...rest } = typeParameterParam;
            newTypeAnnotation = j.tsTypeAnnotation.from({ typeAnnotation: j.tsTypeReference.from({ ...rest }) });
        }
        else {
            // form of React.FC<{ foo: number }> or React.SFC<{ foo: number }>
            const inlineTypeDeclaration = typeParameterParam;
            // remove locations to avoid messing up with commans
            const newMembers = inlineTypeDeclaration.members.map(({ loc, ...rest }) => {
                // dynamically call the api method to build the proper node. For example TSPropertySignature becomes tsPropertySignature
                const key = rest.type.slice(0, 2).toLowerCase() + rest.type.slice(2);
                return j[key].from({ ...rest });
            });
            newTypeAnnotation = j.tsTypeAnnotation.from({ typeAnnotation: j.tsTypeLiteral.from({ members: newMembers }) });
        }
        // build the new nodes
        const arrowFunctionNode = n.node.init;
        const firstParam = arrowFunctionNode.params[0];
        let arrowFunctionFirstParameter;
        // form of (props) =>
        if (isIdentifier(firstParam)) {
            arrowFunctionFirstParameter = j.identifier.from({
                ...firstParam,
                typeAnnotation: newTypeAnnotation,
            });
        }
        // form of ({ foo }) =>
        if (isObjectPattern(firstParam)) {
            arrowFunctionFirstParameter = j.objectPattern.from({
                ...firstParam,
                typeAnnotation: newTypeAnnotation,
            });
        }
        const newVariableDeclarator = j.variableDeclarator.from({
            ...n.node,
            init: j.arrowFunctionExpression.from({
                ...arrowFunctionNode,
                params: [arrowFunctionFirstParameter],
            }),
        });
        n.replace(newVariableDeclarator);
        return;
    }
    function removeReactFCorSFCdeclaration(n) {
        const { id, ...restOfNode } = n.node;
        const { typeAnnotation, ...restOfId } = id;
        const newId = j.identifier.from({ ...restOfId });
        const newVariableDeclarator = j.variableDeclarator.from({
            ...restOfNode,
            id: newId,
        });
        n.replace(newVariableDeclarator);
    }
    try {
        const root = j(fileInfo.source);
        let hasModifications = false;
        const newSource = root
            .find(j.VariableDeclarator, (n) => {
            const identifier = n?.id;
            const typeName = identifier?.typeAnnotation?.typeAnnotation?.typeName;
            const genericParamsType = identifier?.typeAnnotation?.typeAnnotation?.typeParameters?.type;
            // verify it is the shape of React.FC<Props> React.SFC<Props>, React.FC<{ type: string }>
            return (typeName?.left?.name === 'React' &&
                ['FC', 'SFC'].includes(typeName?.right?.name) &&
                ['TSQualifiedName', 'TSTypeParameterInstantiation'].includes(genericParamsType));
        })
            .forEach((n) => {
            hasModifications = true;
            addPropsTypeToComponentBody(n);
            removeReactFCorSFCdeclaration(n);
        })
            .toSource();
        return hasModifications ? newSource : null;
    }
    catch (e) {
        console.log(e);
    }
};
exports.parser = 'tsx';


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	__webpack_require__.ab = __dirname + "/";/************************************************************************/
/******/ 	// module exports must be returned from runtime so entry inlining is disabled
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(580);
/******/ })()
;