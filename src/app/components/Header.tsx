import Link from "next/link";
import styles from "../style/module/Header.module.css";

export default function Header() {
  return (
    <div className={styles.header}>
      <picture>
        <source srcSet="/img/png/logo.png" type="image/png" />
        <img alt="logo" src="/img/png/logo.png" className="logo" />
      </picture>
      <h1>
        <Link href="/">ytmgr</Link>
      </h1>
    </div>
  );
}
