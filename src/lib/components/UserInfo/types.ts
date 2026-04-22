import type { AvatarColor, AvatarSize } from '../Avatar/types';

export interface UserInfoProps {
	name?: string;
	lastName?: string;
	description?: string;
	photoUrl?: string;
	avatarColor?: AvatarColor;
	avatarSize?: AvatarSize;
	class?: string;
}
