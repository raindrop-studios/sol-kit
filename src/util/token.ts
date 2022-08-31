import * as anchor from '@project-serum/anchor';
import {
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  createCreateMasterEditionV3Instruction,
  createCreateMetadataAccountV2Instruction,
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
} from '@metaplex-foundation/mpl-token-metadata';
import { sendTransactionWithRetry } from '../transaction';

const createMintNFTInstructions = async (
  provider: anchor.AnchorProvider,
  mintKeypair: anchor.web3.Keypair,
) => {
  const balanceNeeded =
    await provider.connection.getMinimumBalanceForRentExemption(MINT_SIZE);

  const createAccountIx = anchor.web3.SystemProgram.createAccount({
    fromPubkey: provider.wallet.publicKey,
    newAccountPubkey: mintKeypair.publicKey,
    lamports: balanceNeeded,
    space: MINT_SIZE,
    programId: TOKEN_PROGRAM_ID,
  });

  const createInitMintIx = createInitializeMintInstruction(
    mintKeypair.publicKey,
    0,
    provider.wallet.publicKey,
    provider.wallet.publicKey,
  );

  const ata = await anchor.utils.token.associatedAddress({
    mint: mintKeypair.publicKey,
    owner: provider.wallet.publicKey,
  });

  const createAtaIx = createAssociatedTokenAccountInstruction(
    provider.wallet.publicKey,
    ata,
    provider.wallet.publicKey,
    mintKeypair.publicKey,
  );

  const createMintToIx = createMintToInstruction(
    mintKeypair.publicKey,
    ata,
    provider.wallet.publicKey,
    1,
  );

  const [metadataPDA] = await anchor.web3.PublicKey.findProgramAddress(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mintKeypair.publicKey.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID,
  );

  const createMetadataAccountV2Ix = createCreateMetadataAccountV2Instruction(
    {
      metadata: metadataPDA,
      mint: mintKeypair.publicKey,
      mintAuthority: provider.wallet.publicKey,
      payer: provider.wallet.publicKey,
      updateAuthority: provider.wallet.publicKey,
    },
    {
      createMetadataAccountArgsV2: {
        data: {
          name: '',
          symbol: '',
          uri: '',
          sellerFeeBasisPoints: 500,
          creators: null,
          collection: null,
          uses: null,
        },
        isMutable: true,
      },
    },
  );

  const [masterEditionPDA] = await anchor.web3.PublicKey.findProgramAddress(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mintKeypair.publicKey.toBuffer(),
      Buffer.from('edition'),
    ],
    TOKEN_METADATA_PROGRAM_ID,
  );

  const createMasterEditionV3Ix = createCreateMasterEditionV3Instruction(
    {
      metadata: metadataPDA,
      edition: masterEditionPDA,
      mint: mintKeypair.publicKey,
      updateAuthority: provider.wallet.publicKey,
      mintAuthority: provider.wallet.publicKey,
      payer: provider.wallet.publicKey,
    },
    {
      createMasterEditionArgs: {
        maxSupply: new anchor.BN(1),
      },
    },
  );

  return [
    createAccountIx,
    createInitMintIx,
    createAtaIx,
    createMintToIx,
    createMetadataAccountV2Ix,
    createMasterEditionV3Ix,
  ];
};

const createMintTokensInstructions = async (
  provider: anchor.AnchorProvider,
  mintKeypair: anchor.web3.Keypair,
  amount: number,
  decimals: number,
) => {
  const balanceNeeded =
    await provider.connection.getMinimumBalanceForRentExemption(MINT_SIZE);

  const createAccountIx = anchor.web3.SystemProgram.createAccount({
    fromPubkey: provider.wallet.publicKey,
    newAccountPubkey: mintKeypair.publicKey,
    lamports: balanceNeeded,
    space: MINT_SIZE,
    programId: TOKEN_PROGRAM_ID,
  });

  const createInitMintIx = createInitializeMintInstruction(
    mintKeypair.publicKey,
    decimals,
    provider.wallet.publicKey,
    provider.wallet.publicKey,
  );

  const ata = await anchor.utils.token.associatedAddress({
    mint: mintKeypair.publicKey,
    owner: provider.wallet.publicKey,
  });

  const createAtaIx = createAssociatedTokenAccountInstruction(
    provider.wallet.publicKey,
    ata,
    provider.wallet.publicKey,
    mintKeypair.publicKey,
  );

  const createMintToIx = createMintToInstruction(
    mintKeypair.publicKey,
    ata,
    provider.wallet.publicKey,
    amount,
  );

  return [createAccountIx, createInitMintIx, createAtaIx, createMintToIx];
};

const mintNFT = async (
  provider: anchor.AnchorProvider,
  mintKeypair: anchor.web3.Keypair,
) => {
  const ixs = await createMintNFTInstructions(provider, mintKeypair);

  return await sendTransactionWithRetry(
    provider.connection,
    provider.wallet,
    ixs,
    [mintKeypair],
    'confirmed',
  );
};

const mintTokens = async (
  provider: anchor.AnchorProvider,
  mintKeypair: anchor.web3.Keypair,
  amount: number,
  decimals: number,
) => {
  const ixs = await createMintTokensInstructions(
    provider,
    mintKeypair,
    amount,
    decimals,
  );

  return await sendTransactionWithRetry(
    provider.connection,
    provider.wallet,
    ixs,
    [mintKeypair],
    'confirmed',
  );
};

const getMetadata = async (
  mint: anchor.web3.PublicKey,
): Promise<anchor.web3.PublicKey> => {
  return (
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID,
    )
  )[0];
};

const getEdition = async (
  mint: anchor.web3.PublicKey,
): Promise<anchor.web3.PublicKey> => {
  return (
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
        Buffer.from('edition'),
      ],
      TOKEN_METADATA_PROGRAM_ID,
    )
  )[0];
};

export {
  createMintNFTInstructions,
  createMintTokensInstructions,
  mintNFT,
  mintTokens,
  getMetadata,
  getEdition,
};
