import { Button, Input, Label, TextField } from 'react-aria-components';
import { ViewLayout } from '../../components/ViewLayout';
import { bounceButton } from '@/shared/styles';
import { useRef, useState, useEffect } from 'react';
import { browser } from 'wxt/browser';
import { i18n } from '@/shared/i18n';
import { DEFAULT_RATING_HOTKEYS, type RatingHotkeyKey } from '@/shared/settings';
import { useRatingHotkeysQuery, useSetRatingHotkeysMutation } from '@/hooks/useBackgroundQueries';
import { AppearanceSection } from './AppearanceSection';
import { ReviewSettingsSection } from './ReviewSettingsSection';
import { GistSyncSection } from './GistSyncSection';
import { DataSection } from './DataSection';
import { AboutSection } from './AboutSection';

function HotkeysSection() {
  const [openPopupShortcut, setOpenPopupShortcut] = useState('');
  const { data: ratingHotkeys = DEFAULT_RATING_HOTKEYS } = useRatingHotkeysQuery();
  const setRatingHotkeysMutation = useSetRatingHotkeysMutation();
  const [ratingHotkeysInput, setRatingHotkeysInput] = useState(DEFAULT_RATING_HOTKEYS);
  const hasInitializedRatingHotkeys = useRef(false);

  useEffect(() => {
    const loadShortcuts = async () => {
      try {
        const commands = await browser.commands.getAll();
        const openPopupCommand = commands.find((command) => command.name === 'open-popup');
        setOpenPopupShortcut(openPopupCommand?.shortcut ?? '');
      } catch (error) {
        console.error('Failed to load shortcuts:', error);
        setOpenPopupShortcut('');
      }
    };

    loadShortcuts();
  }, []);

  useEffect(() => {
    if (hasInitializedRatingHotkeys.current) {
      return;
    }
    setRatingHotkeysInput(ratingHotkeys);
    hasInitializedRatingHotkeys.current = true;
  }, [ratingHotkeys]);

  const handleManageShortcuts = async () => {
    try {
      await browser.tabs.create({ url: 'chrome://extensions/shortcuts' });
    } catch (error) {
      console.error('Failed to open shortcuts page:', error);
    }
  };

  const normalizeHotkeyInput = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }
    return trimmed.slice(-1).toLowerCase();
  };

  const handleRatingHotkeyChange = (key: RatingHotkeyKey, value: string) => {
    const normalized = normalizeHotkeyInput(value);
    setRatingHotkeysInput((prev) => ({ ...prev, [key]: normalized }));
  };

  const handleRatingHotkeyBlur = (key: RatingHotkeyKey, rawValue: string) => {
    const value = normalizeHotkeyInput(rawValue);
    if (!value) {
      setRatingHotkeysInput(ratingHotkeys);
      return;
    }

    const nextHotkeys = { ...ratingHotkeys, [key]: value };
    setRatingHotkeysInput((prev) => ({ ...prev, [key]: value }));
    setRatingHotkeysMutation.mutate(nextHotkeys);
  };

  const handleRatingHotkeyFocus = (key: RatingHotkeyKey) => {
    setRatingHotkeysInput((prev) => ({ ...prev, [key]: '' }));
  };

  return (
    <div className="mb-6 p-4 rounded-lg bg-secondary text-primary">
      <h3 className="text-lg font-semibold mb-2">{i18n.settings.hotkeys.title}</h3>
      <p className="text-sm text-tertiary mb-4">{i18n.settings.hotkeys.description}</p>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span>{i18n.settings.hotkeys.openPopupLabel}</span>
          <span className="text-sm text-tertiary">
            {i18n.settings.hotkeys.currentShortcutLabel}: {openPopupShortcut || i18n.settings.hotkeys.notSet}
          </span>
        </div>
        <div className="space-y-2">
          <div className="text-sm text-tertiary">{i18n.settings.hotkeys.ratingShortcutsLabel}</div>
          <div className="space-y-2">
            <TextField className="flex items-center justify-between">
              <Label>{i18n.ratings.again}</Label>
              <Input
                value={ratingHotkeysInput.again}
                onChange={(event) => handleRatingHotkeyChange('again', event.target.value)}
                onFocus={() => handleRatingHotkeyFocus('again')}
                onBlur={(event) => handleRatingHotkeyBlur('again', event.currentTarget.value)}
                placeholder={DEFAULT_RATING_HOTKEYS.again}
                maxLength={1}
                className="w-12 px-2 py-1 rounded border bg-tertiary text-primary border-current text-center"
              />
            </TextField>
            <TextField className="flex items-center justify-between">
              <Label>{i18n.ratings.hard}</Label>
              <Input
                value={ratingHotkeysInput.hard}
                onChange={(event) => handleRatingHotkeyChange('hard', event.target.value)}
                onFocus={() => handleRatingHotkeyFocus('hard')}
                onBlur={(event) => handleRatingHotkeyBlur('hard', event.currentTarget.value)}
                placeholder={DEFAULT_RATING_HOTKEYS.hard}
                maxLength={1}
                className="w-12 px-2 py-1 rounded border bg-tertiary text-primary border-current text-center"
              />
            </TextField>
            <TextField className="flex items-center justify-between">
              <Label>{i18n.ratings.good}</Label>
              <Input
                value={ratingHotkeysInput.good}
                onChange={(event) => handleRatingHotkeyChange('good', event.target.value)}
                onFocus={() => handleRatingHotkeyFocus('good')}
                onBlur={(event) => handleRatingHotkeyBlur('good', event.currentTarget.value)}
                placeholder={DEFAULT_RATING_HOTKEYS.good}
                maxLength={1}
                className="w-12 px-2 py-1 rounded border bg-tertiary text-primary border-current text-center"
              />
            </TextField>
            <TextField className="flex items-center justify-between">
              <Label>{i18n.ratings.easy}</Label>
              <Input
                value={ratingHotkeysInput.easy}
                onChange={(event) => handleRatingHotkeyChange('easy', event.target.value)}
                onFocus={() => handleRatingHotkeyFocus('easy')}
                onBlur={(event) => handleRatingHotkeyBlur('easy', event.currentTarget.value)}
                placeholder={DEFAULT_RATING_HOTKEYS.easy}
                maxLength={1}
                className="w-12 px-2 py-1 rounded border bg-tertiary text-primary border-current text-center"
              />
            </TextField>
          </div>
          <p className="text-xs text-tertiary">{i18n.settings.hotkeys.focusNote}</p>
        </div>
        <Button
          onPress={handleManageShortcuts}
          className={`w-full px-4 py-2 rounded transition-opacity hover:opacity-80 bg-tertiary text-primary ${bounceButton}`}
        >
          {i18n.settings.hotkeys.manageShortcuts}
        </Button>
      </div>
    </div>
  );
}

export function SettingsView() {
  return (
    <ViewLayout title={i18n.settings.title}>
      <AppearanceSection />
      <HotkeysSection />
      <ReviewSettingsSection />
      <GistSyncSection />
      <DataSection />
      <AboutSection />
    </ViewLayout>
  );
}
