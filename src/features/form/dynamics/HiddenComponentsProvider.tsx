import { useEffect } from 'react';

import { useCurrentDataModelName } from 'src/features/datamodel/useBindingSchema';
import { useDynamics } from 'src/features/form/dynamics/DynamicsContext';
import { FD } from 'src/features/formData/FormDataWrite';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { useDataModelBindingTranspose } from 'src/utils/layout/useDataModelBindingTranspose';
import { useNodeTraversalSelector } from 'src/utils/layout/useNodeTraversal';
import { splitDashedKey } from 'src/utils/splitDashedKey';
import { typedBoolean } from 'src/utils/typing';
import type { IConditionalRenderingRule } from 'src/features/form/dynamics/index';
import type { FormDataSelector } from 'src/layout';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { DataModelTransposeSelector } from 'src/utils/layout/useDataModelBindingTranspose';

/**
 * This replaces checkIfConditionalRulesShouldRunSaga(), and fixes a problem that was hard to solve in sagas;
 * namely, that expressions that cause a component to suddenly be visible might also cause other component lookups
 * to start producing a value, so we don't really know how many times we need to run the expressions to reach
 * a stable state. As React hooks are...reactive, we can just run the expressions again when the data changes, and
 * thus continually run the expressions until they stabilize. You _could_ run into an infinite loop if you
 * have a circular dependency in your expressions, but that's a problem with your form, not this code.
 */
export function HiddenComponentsProvider() {
  const hidden = useLegacyHiddenComponents();
  const setHidden = NodesInternal.useMarkHiddenViaRule();

  useEffect(() => {
    setHidden(hidden);
  }, [hidden, setHidden]);

  return null;
}

function useLegacyHiddenComponents() {
  const rules = useDynamics()?.conditionalRendering ?? null;
  const transposeSelector = useDataModelBindingTranspose();
  const formDataSelector = FD.useDebouncedSelector();
  const nodeDataSelector = NodesInternal.useNodeDataSelector();
  const traversalSelector = useNodeTraversalSelector();
  const hiddenNodes: { [nodeId: string]: true } = {};
  const defaultDataType = useCurrentDataModelName() ?? '';

  if (!window.conditionalRuleHandlerObject || !rules || Object.keys(rules).length === 0) {
    // Rules have not been initialized
    return hiddenNodes;
  }

  const props = [defaultDataType, hiddenNodes, formDataSelector, transposeSelector] as const;
  const topLevelNode = traversalSelector((t) => t.allNodes()[0], []);
  for (const key of Object.keys(rules)) {
    if (!key) {
      continue;
    }

    const rule: IConditionalRenderingRule = rules[key];
    if (rule.repeatingGroup) {
      const groupId = rule.repeatingGroup.groupId;
      const node = traversalSelector((t) => t.findById(groupId), [groupId]);
      if (node?.isType('RepeatingGroup')) {
        const firstChildren = pickFirstNodes(nodeDataSelector, traversalSelector, node);
        for (const firstChild of firstChildren) {
          if (rule.repeatingGroup.childGroupId && firstChild) {
            const rowIndex = firstChild.rowIndex!;
            const childId = `${rule.repeatingGroup.childGroupId}-${rowIndex}`;
            const childNode = traversalSelector((t) => t.findById(childId), [childId]);
            if (childNode && childNode.isType('RepeatingGroup')) {
              const nestedChildren = pickFirstNodes(nodeDataSelector, traversalSelector, childNode);
              for (const firstNestedChild of nestedChildren) {
                runConditionalRenderingRule(rule, firstNestedChild, ...props);
              }
            }
          } else if (firstChild) {
            runConditionalRenderingRule(rule, firstChild, ...props);
          }
        }
      }
    } else {
      runConditionalRenderingRule(rule, topLevelNode, ...props);
    }
  }

  return hiddenNodes;
}

function pickFirstNodes(
  nodeDataSelector: ReturnType<typeof NodesInternal.useNodeDataSelector>,
  traversalSelector: ReturnType<typeof useNodeTraversalSelector>,
  node: LayoutNode<'RepeatingGroup'>,
) {
  const targets = nodeDataSelector(
    (picker) =>
      picker(node)
        ?.item?.rows.filter(typedBoolean)
        .map((row) => row && row.itemIds && row.itemIds[0]) ?? [],
    [node],
  );

  return traversalSelector((t) => targets.map((id) => t.findById(id)).filter(typedBoolean), [node, targets]);
}

function runConditionalRenderingRule(
  rule: IConditionalRenderingRule,
  node: LayoutNode | undefined,
  defaultDataType: string,
  hiddenNodes: { [nodeId: string]: true },
  formDataSelector: FormDataSelector,
  transposeSelector: DataModelTransposeSelector,
) {
  const functionToRun = rule.selectedFunction;
  const inputKeys = Object.keys(rule.inputParams);

  const inputObj = {} as Record<string, string | number | boolean | null>;
  for (const key of inputKeys) {
    const param = rule.inputParams[key].replace(/{\d+}/g, '');
    const binding: IDataModelReference = { dataType: defaultDataType, field: param };
    const transposed = (node ? transposeSelector(node, binding) : undefined) ?? binding;
    const value = formDataSelector(transposed);

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      inputObj[key] = value;
    } else {
      inputObj[key] = null;
    }
  }

  const func = window.conditionalRuleHandlerObject[functionToRun];
  if (!func || typeof func !== 'function') {
    window.logErrorOnce(
      `Conditional rule function '${functionToRun}' not found, rules referencing this function will not run.`,
    );
    return;
  }

  const result = func(inputObj);
  const action = rule.selectedAction;
  const hide = (action === 'Show' && !result) || (action === 'Hide' && result);

  const splitId = splitDashedKey(node?.id ?? '');
  for (const elementToPerformActionOn of Object.keys(rule.selectedFields)) {
    if (elementToPerformActionOn && hide) {
      const elementId = rule.selectedFields[elementToPerformActionOn].replace(/{\d+}/g, (match) => {
        const index = match.replace(/[{}]/g, '');
        return `-${splitId.depth[index]}`;
      });

      hiddenNodes[elementId] = true;
    }
  }
}
