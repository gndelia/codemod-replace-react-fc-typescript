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
  TSTypeAnnotation,
} from 'jscodeshift'

const isIdentifier = (x: any): x is Identifier => (x as Identifier).type === 'Identifier'
const isTsTypeReference = (x: any): x is TSTypeReference => (x as TSTypeReference).type === 'TSTypeReference'
const isObjectPattern = (x: any): x is ObjectPattern => (x as ObjectPattern).type === 'ObjectPattern'

export default (fileInfo: FileInfo, { j }: API) => {
  function addPropsTypeToComponentBody(n: ASTPath<VariableDeclarator>) {
    // extract the Prop's type text
    const reactFcOrSfcNode = (n.node.id as Identifier).typeAnnotation!.typeAnnotation as TSTypeReference
    // shape of React.FC (no props)
    if (!reactFcOrSfcNode.typeParameters) {
      return
    }
    const typeParameterParam = reactFcOrSfcNode.typeParameters.params[0]
    let newTypeAnnotation: TSTypeAnnotation | undefined

    // form of React.FC<Props> or React.SFC<Props>
    if (isTsTypeReference(typeParameterParam)) {
      const { loc, ...rest } = typeParameterParam
      newTypeAnnotation = j.tsTypeAnnotation.from({ typeAnnotation: j.tsTypeReference.from({ ...rest }) })
    } else {
      // form of React.FC<{ foo: number }> or React.SFC<{ foo: number }>
      const inlineTypeDeclaration = typeParameterParam as TSTypeLiteral
      // remove locations to avoid messing up with commans
      const newMembers = inlineTypeDeclaration.members.map(({ loc, ...rest }) => {
        // dynamically call the api method to build the proper node. For example TSPropertySignature becomes tsPropertySignature
        const key = rest.type.slice(0, 2).toLowerCase() + rest.type.slice(2)
        return j[key].from({ ...rest })
      })
      newTypeAnnotation = j.tsTypeAnnotation.from({ typeAnnotation: j.tsTypeLiteral.from({ members: newMembers }) })
    }
    // build the new nodes
    const arrowFunctionNode = n.node.init as ArrowFunctionExpression
    const firstParam = arrowFunctionNode.params[0]

    let arrowFunctionFirstParameter: Identifier | ObjectPattern | undefined
    // form of (props) =>
    if (isIdentifier(firstParam)) {
      arrowFunctionFirstParameter = j.identifier.from({
        ...firstParam,
        typeAnnotation: newTypeAnnotation!,
      })
    }

    // form of ({ foo }) =>
    if (isObjectPattern(firstParam)) {
      arrowFunctionFirstParameter = j.objectPattern.from({
        ...firstParam,
        typeAnnotation: newTypeAnnotation!,
      })
    }

    const newVariableDeclarator = j.variableDeclarator.from({
      ...n.node,
      init: j.arrowFunctionExpression.from({
        ...arrowFunctionNode,
        params: [arrowFunctionFirstParameter!],
      }),
    })
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
        // verify it is the shape of React.FC<Props> React.SFC<Props>, React.FC<{ type: string }>
        return (
          typeName?.left?.name === 'React' &&
          ['FC', 'SFC'].includes(typeName?.right?.name) &&
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

export const parser = 'tsx'
