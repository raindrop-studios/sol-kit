import * as anchor from '@project-serum/anchor';
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
  const tokenProgram = anchor.Spl.token(provider);
  const associatedTokenProgram = anchor.Spl.associatedToken(provider);

  const mintSpace = tokenProgram.account.mint.size;
  const balanceNeeded =
    await provider.connection.getMinimumBalanceForRentExemption(mintSpace);

  const createAccountIx = anchor.web3.SystemProgram.createAccount({
    fromPubkey: provider.wallet.publicKey,
    newAccountPubkey: mintKeypair.publicKey,
    lamports: balanceNeeded,
    space: mintSpace,
    programId: tokenProgram.programId,
  });

  const createInitMintIx = await tokenProgram.methods
    .initializeMint(0, provider.wallet.publicKey, provider.wallet.publicKey)
    .accounts({
      mint: mintKeypair.publicKey,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .instruction();

  const ata = await anchor.utils.token.associatedAddress({
    mint: mintKeypair.publicKey,
    owner: provider.wallet.publicKey,
  });

  const createAtaIx = await associatedTokenProgram.methods
    .create()
    .accounts({
      authority: provider.wallet.publicKey,
      associatedAccount: ata,
      owner: provider.wallet.publicKey,
      mint: mintKeypair.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: tokenProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .instruction();

  const createMintToIx = await tokenProgram.methods
    .mintTo(new anchor.BN(1))
    .accounts({
      mint: mintKeypair.publicKey,
      to: ata,
      authority: provider.wallet.publicKey,
    })
    .instruction();

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
  const tokenProgram = anchor.Spl.token(provider);
  const associatedTokenProgram = anchor.Spl.associatedToken(provider);

  const mintSpace = tokenProgram.account.mint.size;
  const balanceNeeded =
    await provider.connection.getMinimumBalanceForRentExemption(mintSpace);

  const createAccountIx = anchor.web3.SystemProgram.createAccount({
    fromPubkey: provider.wallet.publicKey,
    newAccountPubkey: mintKeypair.publicKey,
    lamports: balanceNeeded,
    space: mintSpace,
    programId: tokenProgram.programId,
  });

  const createInitMintIx = await tokenProgram.methods
    .initializeMint(
      decimals,
      provider.wallet.publicKey,
      provider.wallet.publicKey,
    )
    .accounts({
      mint: mintKeypair.publicKey,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .instruction();

  const ata = await anchor.utils.token.associatedAddress({
    mint: mintKeypair.publicKey,
    owner: provider.wallet.publicKey,
  });

  const createAtaIx = await associatedTokenProgram.methods
    .create()
    .accounts({
      authority: provider.wallet.publicKey,
      associatedAccount: ata,
      owner: provider.wallet.publicKey,
      mint: mintKeypair.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: tokenProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .instruction();

  const createMintToIx = await tokenProgram.methods
    .mintTo(new anchor.BN(amount))
    .accounts({
      mint: mintKeypair.publicKey,
      to: ata,
      authority: provider.wallet.publicKey,
    })
    .instruction();

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
