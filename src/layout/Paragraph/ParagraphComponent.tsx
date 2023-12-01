import React from 'react';

import { Paragraph } from '@digdir/design-system-react';

import { HelpTextContainer } from 'src/components/form/HelpTextContainer';
import { useLanguage } from 'src/features/language/useLanguage';
import classes from 'src/layout/Paragraph/ParagraphComponent.module.css';
import { getPlainTextFromNode } from 'src/utils/stringHelper';
import type { PropsFromGenericComponent } from 'src/layout';

export type IParagraphProps = PropsFromGenericComponent<'Paragraph'>;

export function ParagraphComponent({ node }: IParagraphProps) {
  const { id, textResourceBindings } = node.item;
  const { lang } = useLanguage();
  const text = lang(textResourceBindings?.title);

  // The lang() function returns an object with a type property set to 'span'
  // if text contains inline-element(s) or just a string.
  const hasInlineContent = text && typeof text === 'object' && 'type' in text && text.type === 'span';

  return (
    <span className={classes.paragraphWrapper}>
      <Paragraph
        as={hasInlineContent ? 'p' : 'div'}
        id={id}
        data-testid={`paragraph-component-${id}`}
      >
        {text}
      </Paragraph>
      {textResourceBindings?.help && (
        <HelpTextContainer
          helpText={lang(textResourceBindings.help)}
          title={getPlainTextFromNode(text)}
        />
      )}
    </span>
  );
}
