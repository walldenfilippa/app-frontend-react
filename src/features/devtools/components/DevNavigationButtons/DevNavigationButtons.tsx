import React from 'react';
import { useDispatch } from 'react-redux';

import { ToggleButton, ToggleButtonGroup } from '@altinn/altinn-design-system';
import { FieldSet, Select } from '@digdir/design-system-react';
import cn from 'classnames';

import classes from 'src/features/devtools/components/DevNavigationButtons/DevNavigationButtons.module.css';
import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import { useAppSelector } from 'src/hooks/useAppSelector';

export const DevNavigationButtons = () => {
  const { currentView, tracks } = useAppSelector((state) => state.formLayout.uiConfig);
  const dispatch = useDispatch();

  function handleChange(newView: string) {
    dispatch(FormLayoutActions.updateCurrentView({ newView }));
  }

  const order = (tracks?.order ?? []).filter((page) => !tracks.hidden.includes(page));

  if (!order?.length) {
    return null;
  }

  const compactView = order?.length > 5;

  return (
    <FieldSet legend='Navigasjon'>
      <div className={compactView ? classes.hidden : classes.responsiveButtons}>
        <ToggleButtonGroup
          onChange={({ selectedValue }) => handleChange(selectedValue)}
          selectedValue={currentView}
        >
          {order?.map((page) => (
            <ToggleButton
              key={page}
              value={page}
            >
              {page}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </div>
      <div className={cn(classes.dropdown, { [classes.responsiveDropdown]: !compactView })}>
        <Select
          value={currentView}
          options={order?.map((page) => ({ value: page, label: page })) ?? []}
          onChange={handleChange}
        />
      </div>
    </FieldSet>
  );
};
