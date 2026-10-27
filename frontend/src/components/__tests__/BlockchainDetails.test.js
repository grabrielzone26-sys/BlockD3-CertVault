import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import BlockchainDetails from '../BlockchainDetails';
import ErrorBoundary from '../ErrorBoundary';

describe('BlockchainDetails', () => {
  const mockProps = {
    transactionHash: 'icp-tx-123',
    ipfsHash: 'Qm...xyz',
    networkName: 'Internet Computer',
    canisterId: 'aaaaa-aa'
  };

  beforeEach(() => {
    window.open = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  it('renders blockchain details correctly', () => {
    render(<BlockchainDetails {...mockProps} />);

    expect(screen.getByText('Blockchain Details')).toBeInTheDocument();
    expect(screen.getByText(mockProps.transactionHash)).toBeInTheDocument();
    expect(screen.getByText(mockProps.ipfsHash)).toBeInTheDocument();
    expect(screen.getByText(mockProps.networkName)).toBeInTheDocument();
    expect(screen.getByText(mockProps.canisterId)).toBeInTheDocument();
  });

  it('opens the ICP dashboard link for canister', async () => {
    render(<BlockchainDetails {...mockProps} />);

    const buttons = screen.getAllByRole('button');
    await act(async () => {
      fireEvent.click(buttons[0]);
    });

    await waitFor(() => {
      expect(window.open).toHaveBeenCalledWith(
        `https://dashboard.internetcomputer.org/canister/${mockProps.canisterId}`,
        '_blank'
      );
    });
  });

  it('handles errors gracefully', async () => {
    window.open.mockImplementation(() => {
      throw new Error('Failed to open');
    });

    render(<BlockchainDetails {...mockProps} />);

    const buttons = screen.getAllByRole('button');
    await act(async () => {
      fireEvent.click(buttons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText(/Failed to open link/)).toBeInTheDocument();
    });
  });

  it('disables links while loading', async () => {
    window.open.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

    render(<BlockchainDetails {...mockProps} />);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      expect(buttons[0]).toHaveAttribute('disabled', '');
      expect(buttons[0]).toHaveClass('opacity-50', 'cursor-not-allowed');
    });
  });

  it('works with error boundary', async () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    const originalError = console.error;
    console.error = jest.fn();

    const { container } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(container).toHaveTextContent('Something went wrong');
      expect(container).toHaveTextContent('Try again');
    });

    console.error = originalError;
  });

  it('handles missing transaction hash', () => {
    const { transactionHash, ...propsWithoutTx } = mockProps;
    render(<BlockchainDetails {...propsWithoutTx} />);

    expect(screen.queryByText('Transaction Reference')).not.toBeInTheDocument();
    expect(screen.getByText('IPFS Hash')).toBeInTheDocument();
  });

  it('hides canister link for local network', () => {
    render(<BlockchainDetails {...mockProps} networkName="local" />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
  });
});
