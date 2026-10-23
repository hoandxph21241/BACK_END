/* Previous session-only persistence, retained for reference. This file is not loaded.
(function (window) {
  'use strict';
  const KEY = 'mediahz.currentSong.v2.1';
  const validId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
  let initialized = false, restoring;
  function init({ player, playlist, storage: suppliedStorage }) {
    if (initialized) return restoring;
    initialized = true;
    let storage, rememberedId = null;
    try {
      storage = suppliedStorage || window.sessionStorage;
      const saved = storage.getItem(KEY);
      if (validId(saved)) rememberedId = saved;
      else if (saved !== null) storage.removeItem(KEY);
    } catch { return Promise.resolve(null); }
    function remember(id) {
      if (id === rememberedId) return;
      try {
        if (id) storage.setItem(KEY, id);
        else storage.removeItem(KEY);
        rememberedId = id;
      } catch { }
    }
    const savedId = rememberedId;
    restoring = savedId && !player.getState().currentSong
      ? player.playSong(savedId, { autoplay: false }).then(state => {
        if (!state?.currentSong || state.currentSong.id !== savedId ||
            player.getState().currentSong?.id !== savedId || player.getState().status === 'loading') return null;
        if (!playlist.getState().initialized) playlist.setPlaylist([state.currentSong], { currentSongId: savedId });
        return state;
      }).catch(error => {
        if ((error.status === 404 || error.status === 410) && !player.getState().currentSong && rememberedId === savedId) remember(null);
        console.warn('Cannot restore saved song:', error.message);
        return null;
      }) : Promise.resolve(null);
    player.subscribe(state => {
      if (state.status === 'idle') remember(null);
      else if (state.status !== 'loading' && validId(state.currentSong?.id)) remember(state.currentSong.id);
    });
    return restoring;
  }
  window.PlayerPersistenceV2_1 = Object.freeze({ init });
})(window);
*/
