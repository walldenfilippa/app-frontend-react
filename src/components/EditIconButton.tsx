import React from 'react';
import type { ReactNode } from 'react';

import { Button } from '@digdir/designsystemet-react';
import { PencilIcon } from '@navikt/aksel-icons';

import classes from 'src/components/EditIconButton.module.css';
export interface IEditIconButtonProps {
  label: ReactNode;
  onClick: () => void;
  id?: string;
}

export function EditIconButton({ id, label, onClick }: IEditIconButtonProps) {
  return (
    <Button
      className={classes.editButton}
      size='small'
      id={id}
      variant='tertiary'
      onClick={onClick}
    >
      <PencilIcon
        fontSize={'1rem'}
        aria-hidden
      />
      {label}
    </Button>
  );
}
