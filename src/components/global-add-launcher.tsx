import React, { useState } from 'react';

import { AddSheet } from '@/components/add-sheet';
import { FAB } from '@/components/fab';

export function GlobalAddLauncher() {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <FAB onPress={() => setAddOpen(true)} />
      <AddSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => setAddOpen(false)}
      />
    </>
  );
}
