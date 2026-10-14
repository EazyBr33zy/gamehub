import { useGame } from '../context/GameContext';
import { isOwnerUser } from '../config/owner';

export function useIsOwner(): boolean {
  const { currentUser } = useGame();
  return isOwnerUser(currentUser);
}
