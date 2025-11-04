// ...new file...
let _suspended = false;

export const setLockSuspended = (v: boolean) => {
  _suspended = !!v;
};

export const isLockSuspended = () => _suspended;