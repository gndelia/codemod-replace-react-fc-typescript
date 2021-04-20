import {
  FileInfo,
  API,
  ArrowFunctionExpression,
  ASTPath,
  Identifier,
  VariableDeclarator,
  TSTypeReference,
  ObjectPattern,
  TSTypeLiteral,
  TSIntersectionType,
  TSTypeAnnotation,
  JSCodeshift,
  FunctionExpression,
} from 'jscodeshift'

export const parser = 'tsx'

const isIdentifier = (x: any): x is Identifier => (x as Identifier).type === 'Identifier'
const isTsTypeReference = (x: any): x is TSTypeReference => (x as TSTypeReference).type === 'TSTypeReference'
const isObjectPattern = (x: any): x is ObjectPattern => (x as ObjectPattern).type === 'ObjectPattern'
const isTsIntersectionType = (x: any): x is TSIntersectionType =>
  (x as TSIntersectionType).type === 'TSIntersectionType'
const isArrowFunctionExpression = (x: any): x is ArrowFunctionExpression =>
  (x as ArrowFunctionExpression).type === 'ArrowFunctionExpression'

export default (fileInfo: FileInfo, { j }: API) => {
  function addPropsTypeToComponentBody(n: ASTPath<VariableDeclarator>) {
    // extract the Prop's type text
    const reactFcOrSfcNode = (n.node.id as Identifier).typeAnnotation!.typeAnnotation as TSTypeReference
    // shape of React.FC (no props)
    if (!reactFcOrSfcNode.typeParameters) {
      return
    }

    const outerNewTypeAnnotation = extractPropsDefinitionFromReactFC(j, reactFcOrSfcNode)
    // build the new nodes
    const componentFunctionNode = n.node.init as ArrowFunctionExpression | FunctionExpression
    // if no params, it could be that the component is not actually using props, so nothing to do here
    if (componentFunctionNode.params.length === 0) {
      return
    }
    const firstParam = componentFunctionNode.params[0]

    let componentFunctionFirstParameter: Identifier | ObjectPattern | undefined
    // form of (props) =>
    if (isIdentifier(firstParam)) {
      componentFunctionFirstParameter = j.identifier.from({
        ...firstParam,
        typeAnnotation: outerNewTypeAnnotation!,
      })
    }

    // form of ({ foo }) =>
    if (isObjectPattern(firstParam)) {
      const { properties, ...restParams } = firstParam
      componentFunctionFirstParameter = j.objectPattern.from({
        ...restParams,
        // remove locations because properties might have a spread like ({ id, ...rest }) => and it breaks otherwise
        properties: properties.map(({ loc, ...rest }) => {
          const key = rest.type.slice(0, 1).toLowerCase() + rest.type.slice(1)
          // This workaround is because the AST parsed has "RestElement, but codeshift (as well as the types) expects "RestProperty"
          // manually doing this works ok. restElement has the properties needed
          if (key === 'restElement') {
            const prop = rest as any
            return j.restProperty.from({ argument: prop.argument })
          }
          return j[key].from({ ...rest })
        }),
        typeAnnotation: outerNewTypeAnnotation!,
      })
    }

    let newInit: ArrowFunctionExpression | FunctionExpression | undefined
    if (isArrowFunctionExpression(componentFunctionNode)) {
      newInit = j.arrowFunctionExpression.from({
        ...componentFunctionNode,
        params: [componentFunctionFirstParameter!],
      })
    } else {
      newInit = j.functionExpression.from({
        ...componentFunctionNode,
        params: [componentFunctionFirstParameter!],
      })
    }
    const newVariableDeclarator = j.variableDeclarator.from({ ...n.node, init: newInit })
    n.replace(newVariableDeclarator)
    return
  }

  function removeReactFCorSFCdeclaration(n: ASTPath<VariableDeclarator>) {
    const { id, ...restOfNode } = n.node
    const { typeAnnotation, ...restOfId } = id as Identifier
    const newId = j.identifier.from({ ...restOfId })
    const newVariableDeclarator = j.variableDeclarator.from({
      ...restOfNode,
      id: newId,
    })
    n.replace(newVariableDeclarator)
  }

  try {
    const root = j(fileInfo.source)
    let hasModifications = false
    const newSource = root
      .find(j.VariableDeclarator, (n: any) => {
        const identifier = n?.id
        const typeName = identifier?.typeAnnotation?.typeAnnotation?.typeName
        const genericParamsType = identifier?.typeAnnotation?.typeAnnotation?.typeParameters?.type
        // verify it is the shape of React.FC<Props> React.SFC<Props>, React.FC<{ type: string }>, FC<Props>, SFC<Props>, and so on

        const isFC = (typeName?.left?.name === 'React' && typeName?.right?.name === 'FC') || typeName?.name === 'FC'
        const isSFC = (typeName?.left?.name === 'React' && typeName?.right?.name === 'SFC') || typeName?.name === 'SFC'

        return (
          (isFC || isSFC) &&
          (['TSQualifiedName', 'TSTypeParameterInstantiation'].includes(genericParamsType) ||
            !identifier?.typeAnnotation?.typeAnnotation?.typeParameters)
        )
      })
      .forEach((n) => {
        hasModifications = true
        addPropsTypeToComponentBody(n)
        removeReactFCorSFCdeclaration(n)
      })
      .toSource()
    return hasModifications ? newSource : null
  } catch (e) {
    console.log(e)
  }
}

function extractPropsDefinitionFromReactFC(j: JSCodeshift, reactFcOrSfcNode: TSTypeReference): TSTypeAnnotation {
  const typeParameterFirstParam = reactFcOrSfcNode.typeParameters!.params[0]
  let newInnerTypeAnnotation: TSTypeReference | TSIntersectionType | TSTypeLiteral | undefined

  // form of React.FC<Props> or React.SFC<Props>
  if (isTsTypeReference(typeParameterFirstParam)) {
    const { loc, ...rest } = typeParameterFirstParam
    newInnerTypeAnnotation = j.tsTypeReference.from({ ...rest })
  } else if (isTsIntersectionType(typeParameterFirstParam)) {
    // form of React.FC<Props & Props2>
    const { loc, ...rest } = typeParameterFirstParam
    newInnerTypeAnnotation = j.tsIntersectionType.from({
      ...rest,
      types: rest.types.map((t) => buildDynamicalNodeByType(j, t)),
    })
  } else {
    // form of React.FC<{ foo: number }> or React.SFC<{ foo: number }>
    const inlineTypeDeclaration = typeParameterFirstParam as TSTypeLiteral
    // remove locations to avoid messing up with commans
    const newMembers = inlineTypeDeclaration.members.map((m) => buildDynamicalNodeByType(j, m))
    newInnerTypeAnnotation = j.tsTypeLiteral.from({ members: newMembers })
  }

  const outerNewTypeAnnotation = j.tsTypeAnnotation.from({ typeAnnotation: newInnerTypeAnnotation })
  return outerNewTypeAnnotation
}

// dynamically call the api method to build the proper node. For example TSPropertySignature becomes tsPropertySignature
function buildDynamicalNodeByType(j: JSCodeshift, { loc, ...rest }: any) {
  const key = rest.type.slice(0, 2).toLowerCase() + rest.type.slice(2)
  return j[key].from({ ...rest })
}
