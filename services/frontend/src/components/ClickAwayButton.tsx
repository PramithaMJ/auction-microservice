import styled from '@emotion/styled';
import tw from 'twin.macro';

interface IProps {
  onClickAway(): void;
}

const StyledClickAwayButton = styled.button`
  ${tw`fixed inset-0 h-full w-full cursor-default outline-none`}
`;

const ClickAwayButton = ({ onClickAway }: IProps) => {
  return (
    <StyledClickAwayButton
      onClick={onClickAway}
      tabIndex={-1}
    ></StyledClickAwayButton>
  );
};

export default ClickAwayButton;
