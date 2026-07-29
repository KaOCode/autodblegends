import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAppDispatch, useAppSelector } from "./hooks";
import { setSession } from "./authSlice";
import { syncWithCloud } from "./profileSlice";
import { fetchGameData } from "./gameDataSlice";

/** No UI - wires up the pieces that live outside React's normal render
 * flow: the Supabase auth listener and the initial game-data fetch. Mount
 * once near the root. */
export function AppBootstrap() {
  const dispatch = useAppDispatch();
  const session = useAppSelector((s) => s.auth.session);
  const syncedUserId = useAppSelector((s) => s.profile.syncedUserId);

  useEffect(() => {
    dispatch(fetchGameData());
  }, [dispatch]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => dispatch(setSession(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      dispatch(setSession(newSession));
    });
    return () => sub.subscription.unsubscribe();
  }, [dispatch]);

  useEffect(() => {
    if (session?.user && syncedUserId !== session.user.id) {
      dispatch(syncWithCloud(session.user.id));
    }
  }, [dispatch, session?.user, syncedUserId]);

  return null;
}
