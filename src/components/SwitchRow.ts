import Adw from 'gi://Adw';

export function createSwitchRow(
    title: string,
    active: boolean,
    onToggle: (newState: boolean) => void,
): Adw.SwitchRow {
    const switchRow = new Adw.SwitchRow({
        title,
        active,
    });

    switchRow.connect('notify::active', () => {
        onToggle(switchRow.active);
    });

    return switchRow;
}
