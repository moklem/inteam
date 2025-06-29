import PropTypes from 'prop-types';

export const UserPropTypes = {
  _id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  email: PropTypes.string.isRequired,
  role: PropTypes.oneOf(['player', 'coach', 'admin']).isRequired
};

export const TeamPropTypes = {
  _id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  description: PropTypes.string,
  players: PropTypes.arrayOf(PropTypes.shape(UserPropTypes)),
  coaches: PropTypes.arrayOf(PropTypes.shape(UserPropTypes))
};

export const EventPropTypes = {
  _id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  startTime: PropTypes.instanceOf(Date).isRequired,
  endTime: PropTypes.instanceOf(Date).isRequired,
  location: PropTypes.string,
  team: PropTypes.shape(TeamPropTypes).isRequired,
  attendingPlayers: PropTypes.arrayOf(PropTypes.shape(UserPropTypes)),
  declinedPlayers: PropTypes.arrayOf(PropTypes.shape(UserPropTypes))
};

export const ChildrenPropTypes = {
  children: PropTypes.node.isRequired
};

export const LayoutPropTypes = {
  ...ChildrenPropTypes,
  isMobile: PropTypes.bool
};

export const AttributePropTypes = {
  _id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  description: PropTypes.string
};

export const TeamComponentPropTypes = {
  team: PropTypes.shape(TeamPropTypes).isRequired,
  isCoach: PropTypes.bool
};
